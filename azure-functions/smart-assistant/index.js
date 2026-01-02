/**
 * Smart Assistant Azure Function with RAG (Retrieval-Augmented Generation)
 * Searches Azure AI Search for relevant programs, then uses Azure OpenAI for response
 */

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT;
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY;
const AZURE_OPENAI_DEPLOYMENT = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o-mini';
const API_VERSION = '2024-02-15-preview';

const AZURE_SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT || 'https://baynavigator-search.search.windows.net';
const AZURE_SEARCH_KEY = process.env.AZURE_SEARCH_KEY;
const SEARCH_INDEX = 'programs';

// System prompt that guides the AI assistant
const SYSTEM_PROMPT = `You are Bay Navigator's assistant. Help Bay Area residents find free and low-cost programs.

RESPONSE FORMAT - Use this exact structure:
1. One brief sentence acknowledging what they need (max 15 words)
2. List 2-4 most relevant programs in this format:

**[Program Name]**
[One sentence about what it offers]
[Phone or website if available]

3. End with: "Verify eligibility directly with each program."

RULES:
- Be concise. No lengthy explanations.
- Only mention programs from the search results provided
- Don't make up details not in the data
- No legal/medical/financial advice
- If no programs match, say "I couldn't find matching programs. Try browsing by category on the main page."`;

// Format programs as structured cards for the response
function formatProgramsAsCards(programs) {
  if (!programs || programs.length === 0) return [];

  return programs.slice(0, 5).map(p => ({
    id: p.id,
    name: p.name,
    category: p.category,
    description: p.description?.slice(0, 150) + (p.description?.length > 150 ? '...' : ''),
    phone: p.phone || null,
    website: p.website || null,
    areas: p.areas || [],
  }));
}

/**
 * Search Azure AI Search for relevant programs
 */
async function searchPrograms(query, filters = {}) {
  if (!AZURE_SEARCH_KEY) {
    console.log('Azure Search not configured, skipping search');
    return [];
  }

  const searchParams = {
    search: query,
    queryType: 'simple',
    searchMode: 'any',
    top: 8,
    select: 'id,name,category,description,whatTheyOffer,howToGetIt,groups,areas,city,website,phone',
  };

  // Add filters if provided
  const filterParts = [];
  if (filters.category) {
    filterParts.push(`category eq '${filters.category}'`);
  }
  if (filters.area) {
    filterParts.push(`areas/any(a: a eq '${filters.area}')`);
  }
  if (filters.group) {
    filterParts.push(`groups/any(g: g eq '${filters.group}')`);
  }
  if (filterParts.length > 0) {
    searchParams.filter = filterParts.join(' and ');
  }

  try {
    const response = await fetch(
      `${AZURE_SEARCH_ENDPOINT}/indexes/${SEARCH_INDEX}/docs/search?api-version=2023-11-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': AZURE_SEARCH_KEY,
        },
        body: JSON.stringify(searchParams),
      }
    );

    if (!response.ok) {
      console.error('Search error:', await response.text());
      return [];
    }

    const data = await response.json();
    return data.value || [];
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

/**
 * Format search results for the AI context
 */
function formatProgramsForContext(programs) {
  if (!programs || programs.length === 0) {
    return 'No matching programs found in the database.';
  }

  return programs.map((p, i) => {
    let text = `${i + 1}. ${p.name} (${p.category})`;
    text += `\n   Description: ${p.description}`;
    if (p.whatTheyOffer) {
      text += `\n   What they offer: ${p.whatTheyOffer.slice(0, 300)}`;
    }
    if (p.howToGetIt) {
      text += `\n   How to get it: ${p.howToGetIt.slice(0, 200)}`;
    }
    if (p.groups && p.groups.length > 0) {
      text += `\n   For: ${p.groups.join(', ')}`;
    }
    if (p.city) {
      text += `\n   Location: ${p.city}`;
    } else if (p.areas && p.areas.length > 0) {
      text += `\n   Areas: ${p.areas.join(', ')}`;
    }
    if (p.phone) {
      text += `\n   Phone: ${p.phone}`;
    }
    if (p.website) {
      text += `\n   Website: ${p.website}`;
    }
    return text;
  }).join('\n\n');
}

/**
 * Extract search keywords from conversation
 */
function extractSearchQuery(message, conversationHistory) {
  // Combine recent messages for context
  const recentContext = conversationHistory
    .slice(-2)
    .map(m => m.content)
    .join(' ');

  // Use the current message, augmented with recent context keywords
  return message;
}

async function callAzureOpenAI(messages) {
  const url = `${AZURE_OPENAI_ENDPOINT}/openai/deployments/${AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${API_VERSION}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': AZURE_OPENAI_KEY
    },
    body: JSON.stringify({
      messages,
      max_tokens: 400,  // Reduced for concise responses
      temperature: 0.5, // Lower for more consistent formatting
      top_p: 0.9,
      frequency_penalty: 0.5, // Higher to reduce repetition
      presence_penalty: 0.2
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure OpenAI API error: ${response.status} - ${error}`);
  }

  return response.json();
}

module.exports = async function (context, req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400'
      }
    };
    return;
  }

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  try {
    // Validate configuration
    if (!AZURE_OPENAI_ENDPOINT || !AZURE_OPENAI_KEY) {
      context.res = {
        status: 503,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Smart assistant is not configured. Please try again later.'
        })
      };
      return;
    }

    // Parse request
    const { message, conversationHistory = [] } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Please provide a message.'
        })
      };
      return;
    }

    const userMessage = message.trim().slice(0, 500);

    // Search for relevant programs
    const searchQuery = extractSearchQuery(userMessage, conversationHistory);
    const programs = await searchPrograms(searchQuery);
    const programContext = formatProgramsForContext(programs);

    context.log(`Found ${programs.length} programs for query: "${searchQuery}"`);

    // Build conversation messages with program context
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content.slice(0, 500)
      })),
      {
        role: 'user',
        content: `User question: ${userMessage}\n\n---\nRelevant programs from database:\n${programContext}`
      }
    ];

    // Call Azure OpenAI
    const completion = await callAzureOpenAI(messages);
    const assistantMessage = completion.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't process your request. Please try again.";

    // Include structured program cards for clean display
    const programCards = formatProgramsAsCards(programs);

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: assistantMessage,
        programs: programCards,
        programsFound: programs.length,
        usage: {
          promptTokens: completion.usage?.prompt_tokens,
          completionTokens: completion.usage?.completion_tokens
        }
      })
    };

  } catch (error) {
    context.log.error('Smart assistant error:', error);

    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Something went wrong. Please try again.'
      })
    };
  }
};
