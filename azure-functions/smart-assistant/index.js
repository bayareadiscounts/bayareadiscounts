/**
 * Smart Assistant Azure Function with RAG (Retrieval-Augmented Generation)
 * Uses Cloudflare Workers AI (Llama 3.1 8B) for keyword extraction
 * Searches Azure AI Search for relevant programs
 */

const { createLogger, createTimer, extractErrorInfo } = require('../shared/logger');

// Cloudflare Workers AI configuration
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_API_TOKEN = process.env.CF_API_TOKEN;
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';

// Azure AI Search configuration (kept for program search)
const AZURE_SEARCH_ENDPOINT =
  process.env.AZURE_SEARCH_ENDPOINT || 'https://baynavigator-search.search.windows.net';
const AZURE_SEARCH_KEY = process.env.AZURE_SEARCH_KEY;
const SEARCH_INDEX = 'programs';

// Bay Area ZIP codes to city mapping
const ZIP_TO_CITY = {
  // Alameda County
  94501: 'Alameda',
  94502: 'Alameda',
  94536: 'Fremont',
  94537: 'Fremont',
  94538: 'Fremont',
  94539: 'Fremont',
  94540: 'Hayward',
  94541: 'Hayward',
  94542: 'Hayward',
  94543: 'Hayward',
  94544: 'Hayward',
  94545: 'Hayward',
  94546: 'Castro Valley',
  94550: 'Livermore',
  94551: 'Livermore',
  94552: 'Castro Valley',
  94555: 'Fremont',
  94557: 'Hayward',
  94560: 'Newark',
  94566: 'Pleasanton',
  94568: 'Dublin',
  94577: 'San Leandro',
  94578: 'San Leandro',
  94579: 'San Leandro',
  94580: 'San Lorenzo',
  94586: 'Sunol',
  94587: 'Union City',
  94588: 'Pleasanton',
  94601: 'Oakland',
  94602: 'Oakland',
  94603: 'Oakland',
  94605: 'Oakland',
  94606: 'Oakland',
  94607: 'Oakland',
  94608: 'Emeryville',
  94609: 'Oakland',
  94610: 'Oakland',
  94611: 'Oakland',
  94612: 'Oakland',
  94613: 'Oakland',
  94618: 'Oakland',
  94619: 'Oakland',
  94620: 'Piedmont',
  94621: 'Oakland',
  94702: 'Berkeley',
  94703: 'Berkeley',
  94704: 'Berkeley',
  94705: 'Berkeley',
  94706: 'Albany',
  94707: 'Berkeley',
  94708: 'Berkeley',
  94709: 'Berkeley',
  94710: 'Berkeley',
  // Contra Costa County
  94505: 'Discovery Bay',
  94506: 'Danville',
  94507: 'Alamo',
  94509: 'Antioch',
  94511: 'Bethel Island',
  94513: 'Brentwood',
  94514: 'Byron',
  94516: 'Canyon',
  94517: 'Clayton',
  94518: 'Concord',
  94519: 'Concord',
  94520: 'Concord',
  94521: 'Concord',
  94522: 'Concord',
  94523: 'Pleasant Hill',
  94524: 'Concord',
  94525: 'Crockett',
  94526: 'Danville',
  94527: 'Concord',
  94528: 'Diablo',
  94529: 'Concord',
  94530: 'El Cerrito',
  94531: 'Antioch',
  94547: 'Hercules',
  94548: 'Knightsen',
  94549: 'Lafayette',
  94553: 'Martinez',
  94556: 'Moraga',
  94561: 'Oakley',
  94563: 'Orinda',
  94564: 'Pinole',
  94565: 'Pittsburg',
  94569: 'Port Costa',
  94570: 'Moraga',
  94572: 'Rodeo',
  94575: 'Moraga',
  94582: 'San Ramon',
  94583: 'San Ramon',
  94595: 'Walnut Creek',
  94596: 'Walnut Creek',
  94597: 'Walnut Creek',
  94598: 'Walnut Creek',
  94801: 'Richmond',
  94802: 'Richmond',
  94803: 'El Sobrante',
  94804: 'Richmond',
  94805: 'Richmond',
  94806: 'San Pablo',
  94820: 'Richmond',
  94850: 'Richmond',
  // Marin County
  94901: 'San Rafael',
  94903: 'San Rafael',
  94904: 'Greenbrae',
  94920: 'Belvedere Tiburon',
  94925: 'Corte Madera',
  94930: 'Fairfax',
  94939: 'Larkspur',
  94941: 'Mill Valley',
  94945: 'Novato',
  94947: 'Novato',
  94949: 'Novato',
  94957: 'Ross',
  94960: 'San Anselmo',
  94965: 'Sausalito',
  // Napa County
  94503: 'American Canyon',
  94558: 'Napa',
  94559: 'Napa',
  94574: 'St. Helena',
  94599: 'Yountville',
  94515: 'Calistoga',
  // San Francisco
  94102: 'San Francisco',
  94103: 'San Francisco',
  94104: 'San Francisco',
  94105: 'San Francisco',
  94107: 'San Francisco',
  94108: 'San Francisco',
  94109: 'San Francisco',
  94110: 'San Francisco',
  94111: 'San Francisco',
  94112: 'San Francisco',
  94114: 'San Francisco',
  94115: 'San Francisco',
  94116: 'San Francisco',
  94117: 'San Francisco',
  94118: 'San Francisco',
  94121: 'San Francisco',
  94122: 'San Francisco',
  94123: 'San Francisco',
  94124: 'San Francisco',
  94127: 'San Francisco',
  94129: 'San Francisco',
  94130: 'San Francisco',
  94131: 'San Francisco',
  94132: 'San Francisco',
  94133: 'San Francisco',
  94134: 'San Francisco',
  94158: 'San Francisco',
  // San Mateo County
  94002: 'Belmont',
  94005: 'Brisbane',
  94010: 'Burlingame',
  94014: 'Daly City',
  94015: 'Daly City',
  94019: 'Half Moon Bay',
  94025: 'Menlo Park',
  94027: 'Atherton',
  94028: 'Portola Valley',
  94030: 'Millbrae',
  94044: 'Pacifica',
  94061: 'Redwood City',
  94062: 'Redwood City',
  94063: 'Redwood City',
  94065: 'Redwood City',
  94066: 'San Bruno',
  94070: 'San Carlos',
  94080: 'South San Francisco',
  94303: 'East Palo Alto',
  94401: 'San Mateo',
  94402: 'San Mateo',
  94403: 'San Mateo',
  94404: 'Foster City',
  // Santa Clara County
  94022: 'Los Altos',
  94024: 'Los Altos',
  94040: 'Mountain View',
  94041: 'Mountain View',
  94043: 'Mountain View',
  94085: 'Sunnyvale',
  94086: 'Sunnyvale',
  94087: 'Sunnyvale',
  94089: 'Sunnyvale',
  94301: 'Palo Alto',
  94304: 'Palo Alto',
  94306: 'Palo Alto',
  95002: 'Alviso',
  95008: 'Campbell',
  95014: 'Cupertino',
  95020: 'Gilroy',
  95030: 'Los Gatos',
  95032: 'Los Gatos',
  95035: 'Milpitas',
  95037: 'Morgan Hill',
  95050: 'Santa Clara',
  95051: 'Santa Clara',
  95054: 'Santa Clara',
  95070: 'Saratoga',
  95110: 'San Jose',
  95111: 'San Jose',
  95112: 'San Jose',
  95113: 'San Jose',
  95116: 'San Jose',
  95117: 'San Jose',
  95118: 'San Jose',
  95119: 'San Jose',
  95120: 'San Jose',
  95121: 'San Jose',
  95122: 'San Jose',
  95123: 'San Jose',
  95124: 'San Jose',
  95125: 'San Jose',
  95126: 'San Jose',
  95127: 'San Jose',
  95128: 'San Jose',
  95129: 'San Jose',
  95130: 'San Jose',
  95131: 'San Jose',
  95132: 'San Jose',
  95133: 'San Jose',
  95134: 'San Jose',
  95135: 'San Jose',
  95136: 'San Jose',
  95138: 'San Jose',
  95139: 'San Jose',
  95148: 'San Jose',
  // Solano County
  94510: 'Benicia',
  94533: 'Fairfield',
  94534: 'Fairfield',
  94585: 'Suisun City',
  94589: 'Vallejo',
  94590: 'Vallejo',
  94591: 'Vallejo',
  95687: 'Vacaville',
  95688: 'Vacaville',
  95620: 'Dixon',
  94571: 'Rio Vista',
  // Sonoma County
  94928: 'Rohnert Park',
  94931: 'Cotati',
  94952: 'Petaluma',
  94954: 'Petaluma',
  95401: 'Santa Rosa',
  95403: 'Santa Rosa',
  95404: 'Santa Rosa',
  95405: 'Santa Rosa',
  95407: 'Santa Rosa',
  95409: 'Santa Rosa',
  95425: 'Cloverdale',
  95436: 'Forestville',
  95446: 'Guerneville',
  95448: 'Healdsburg',
  95472: 'Sebastopol',
  95476: 'Sonoma',
  95492: 'Windsor',
};

// City to county mapping
const CITY_TO_COUNTY = {
  // Alameda County
  Alameda: 'Alameda County',
  Albany: 'Alameda County',
  Berkeley: 'Alameda County',
  'Castro Valley': 'Alameda County',
  Dublin: 'Alameda County',
  Emeryville: 'Alameda County',
  Fremont: 'Alameda County',
  Hayward: 'Alameda County',
  Livermore: 'Alameda County',
  Newark: 'Alameda County',
  Oakland: 'Alameda County',
  Piedmont: 'Alameda County',
  Pleasanton: 'Alameda County',
  'San Leandro': 'Alameda County',
  'San Lorenzo': 'Alameda County',
  Sunol: 'Alameda County',
  'Union City': 'Alameda County',
  // Contra Costa County
  Alamo: 'Contra Costa County',
  Antioch: 'Contra Costa County',
  'Bethel Island': 'Contra Costa County',
  Brentwood: 'Contra Costa County',
  Byron: 'Contra Costa County',
  Canyon: 'Contra Costa County',
  Clayton: 'Contra Costa County',
  Concord: 'Contra Costa County',
  Crockett: 'Contra Costa County',
  Danville: 'Contra Costa County',
  Diablo: 'Contra Costa County',
  'Discovery Bay': 'Contra Costa County',
  'El Cerrito': 'Contra Costa County',
  'El Sobrante': 'Contra Costa County',
  Hercules: 'Contra Costa County',
  Knightsen: 'Contra Costa County',
  Lafayette: 'Contra Costa County',
  Martinez: 'Contra Costa County',
  Moraga: 'Contra Costa County',
  Oakley: 'Contra Costa County',
  Orinda: 'Contra Costa County',
  Pinole: 'Contra Costa County',
  Pittsburg: 'Contra Costa County',
  'Pleasant Hill': 'Contra Costa County',
  'Port Costa': 'Contra Costa County',
  Richmond: 'Contra Costa County',
  Rodeo: 'Contra Costa County',
  'San Pablo': 'Contra Costa County',
  'San Ramon': 'Contra Costa County',
  'Walnut Creek': 'Contra Costa County',
  // Marin County
  Belvedere: 'Marin County',
  'Belvedere Tiburon': 'Marin County',
  'Corte Madera': 'Marin County',
  Fairfax: 'Marin County',
  Greenbrae: 'Marin County',
  Larkspur: 'Marin County',
  'Mill Valley': 'Marin County',
  Novato: 'Marin County',
  Ross: 'Marin County',
  'San Anselmo': 'Marin County',
  'San Rafael': 'Marin County',
  Sausalito: 'Marin County',
  Tiburon: 'Marin County',
  // Napa County
  'American Canyon': 'Napa County',
  Calistoga: 'Napa County',
  Napa: 'Napa County',
  'St. Helena': 'Napa County',
  Yountville: 'Napa County',
  // San Francisco
  'San Francisco': 'San Francisco',
  SF: 'San Francisco',
  // San Mateo County
  Atherton: 'San Mateo County',
  Belmont: 'San Mateo County',
  Brisbane: 'San Mateo County',
  Burlingame: 'San Mateo County',
  'Daly City': 'San Mateo County',
  'East Palo Alto': 'San Mateo County',
  'Foster City': 'San Mateo County',
  'Half Moon Bay': 'San Mateo County',
  'Menlo Park': 'San Mateo County',
  Millbrae: 'San Mateo County',
  Pacifica: 'San Mateo County',
  'Portola Valley': 'San Mateo County',
  'Redwood City': 'San Mateo County',
  'San Bruno': 'San Mateo County',
  'San Carlos': 'San Mateo County',
  'San Mateo': 'San Mateo County',
  'South San Francisco': 'San Mateo County',
  // Santa Clara County
  Alviso: 'Santa Clara County',
  Campbell: 'Santa Clara County',
  Cupertino: 'Santa Clara County',
  Gilroy: 'Santa Clara County',
  'Los Altos': 'Santa Clara County',
  'Los Gatos': 'Santa Clara County',
  Milpitas: 'Santa Clara County',
  'Morgan Hill': 'Santa Clara County',
  'Mountain View': 'Santa Clara County',
  'Palo Alto': 'Santa Clara County',
  'San Jose': 'Santa Clara County',
  'Santa Clara': 'Santa Clara County',
  Saratoga: 'Santa Clara County',
  Sunnyvale: 'Santa Clara County',
  // Solano County
  Benicia: 'Solano County',
  Dixon: 'Solano County',
  Fairfield: 'Solano County',
  'Rio Vista': 'Solano County',
  'Suisun City': 'Solano County',
  Vacaville: 'Solano County',
  Vallejo: 'Solano County',
  // Sonoma County
  Cloverdale: 'Sonoma County',
  Cotati: 'Sonoma County',
  Forestville: 'Sonoma County',
  Guerneville: 'Sonoma County',
  Healdsburg: 'Sonoma County',
  Petaluma: 'Sonoma County',
  'Rohnert Park': 'Sonoma County',
  'Santa Rosa': 'Sonoma County',
  Sebastopol: 'Sonoma County',
  Sonoma: 'Sonoma County',
  Windsor: 'Sonoma County',
};

// All valid Bay Area counties
const BAY_AREA_COUNTIES = [
  'Alameda County',
  'Contra Costa County',
  'Marin County',
  'Napa County',
  'San Francisco',
  'San Mateo County',
  'Santa Clara County',
  'Solano County',
  'Sonoma County',
];

/**
 * Extract geographic info from query (zip code or city name)
 * Returns { city, county } if found, or null
 */
function extractLocation(query) {
  // Check for zip code (5 digits)
  const zipMatch = query.match(/\b(\d{5})\b/);
  if (zipMatch) {
    const zip = zipMatch[1];
    const city = ZIP_TO_CITY[zip];
    if (city) {
      const county = CITY_TO_COUNTY[city];
      return { zip, city, county };
    }
  }

  // Check for city name (case-insensitive)
  const lowerQuery = query.toLowerCase();
  for (const [city, county] of Object.entries(CITY_TO_COUNTY)) {
    if (lowerQuery.includes(city.toLowerCase())) {
      return { city, county };
    }
  }

  // Check for county name directly
  for (const county of BAY_AREA_COUNTIES) {
    if (
      lowerQuery.includes(county.toLowerCase()) ||
      lowerQuery.includes(county.replace(' County', '').toLowerCase())
    ) {
      return { county };
    }
  }

  return null;
}

// Format programs as structured cards for the response
function formatProgramsAsCards(programs) {
  if (!programs || programs.length === 0) return [];

  return programs.slice(0, 5).map((p) => ({
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
// Essential synonym mappings for common search terms
// Kept minimal to avoid performance issues while covering key terms
const SYNONYMS = {
  // Demographics
  senior: ['seniors', 'elderly', '65+', '60+'],
  seniors: ['senior', 'elderly', '65+'],
  veteran: ['veterans', 'military', 'vet'],
  veterans: ['veteran', 'military'],
  disabled: ['disability', 'disabilities'],
  disability: ['disabled', 'disabilities'],
  child: ['children', 'kids', 'youth'],
  children: ['child', 'kids', 'youth'],
  infant: ['baby', 'newborn', 'toddler'],
  baby: ['infant', 'newborn', 'toddler'],
  student: ['students', 'college'],
  family: ['families', 'parents'],
  pregnant: ['pregnancy', 'prenatal', 'expecting'],
  homeless: ['unhoused', 'houseless', 'shelter'],
  unhoused: ['homeless', 'houseless'],
  immigrant: ['immigrants', 'refugee'],

  // Food
  food: ['groceries', 'meals', 'hungry', 'calfresh', 'snap', 'ebt'],
  hungry: ['hunger', 'food', 'meals'],
  snap: ['calfresh', 'ebt', 'food stamps'],
  calfresh: ['snap', 'ebt', 'food stamps'],

  // Housing & Utilities
  housing: ['rent', 'shelter', 'apartment'],
  rent: ['rental', 'housing', 'apartment'],
  utility: ['utilities', 'electric', 'gas', 'water'],
  utilities: ['utility', 'electric', 'gas', 'bills'],
  electric: ['electricity', 'power', 'pge'],

  // Transportation
  transportation: ['transit', 'bus', 'bart', 'muni', 'clipper'],
  transit: ['transportation', 'bus', 'bart'],
  bus: ['transit', 'muni'],

  // Healthcare
  health: ['healthcare', 'medical', 'clinic'],
  medical: ['health', 'healthcare', 'doctor'],
  dental: ['dentist', 'teeth'],
  mental: ['mental health', 'therapy', 'counseling'],

  // Childcare & Education
  childcare: ['child care', 'daycare', 'preschool'],
  daycare: ['childcare', 'preschool'],

  // Financial
  bills: ['bill', 'payment'],
  tax: ['taxes', 'vita', 'tax preparation'],
  free: ['discount', 'low cost'],
  discount: ['discounts', 'free', 'reduced'],

  // Legal
  legal: ['lawyer', 'attorney'],
  lawyer: ['attorney', 'legal'],

  // General
  help: ['assistance', 'support', 'program'],
  'low-income': ['income-eligible', 'low income'],
};

/**
 * Expand query with synonyms for better matching
 */
function expandQueryWithSynonyms(query) {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  const expansions = new Set(words);

  for (const word of words) {
    if (SYNONYMS[word]) {
      SYNONYMS[word].forEach((syn) => expansions.add(syn));
    }
  }

  // Return original query plus key expansions
  const expandedTerms = Array.from(expansions).slice(0, 15).join(' ');
  return expandedTerms;
}

async function searchPrograms(query, location = null) {
  if (!AZURE_SEARCH_KEY) {
    console.log('Azure Search not configured, skipping search');
    return [];
  }

  // Expand query with synonyms
  const expandedQuery = expandQueryWithSynonyms(query);
  console.log(`Original query: "${query}" -> Expanded: "${expandedQuery}"`);

  const searchParams = {
    search: expandedQuery,
    queryType: 'simple',
    searchMode: 'any',
    top: 10,
    select: 'id,name,category,description,whatTheyOffer,howToGetIt,groups,areas,city,website,phone',
    searchFields: 'name,category,description,whatTheyOffer,howToGetIt,groups',
  };

  // If location detected, filter to show:
  // 1. Programs in their specific city/county
  // 2. Bay Area-wide programs (always eligible)
  // 3. Statewide programs (always eligible)
  // 4. Nationwide programs (always eligible)
  if (location && location.county) {
    const county = location.county;
    const city = location.city;

    // Build filter: match specific area OR regional/state/national programs
    const areaFilters = [
      `areas/any(a: a eq 'Bay Area')`,
      `areas/any(a: a eq 'Statewide')`,
      `areas/any(a: a eq 'California')`,
      `areas/any(a: a eq 'Nationwide')`,
      `areas/any(a: a eq '${county}')`,
    ];

    // Add city filter if we have it
    if (city) {
      areaFilters.push(`city eq '${city}'`);
      areaFilters.push(`areas/any(a: a eq '${city}')`);
    }

    searchParams.filter = `(${areaFilters.join(' or ')})`;
    console.log(`Location filter applied: ${searchParams.filter}`);
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
 * Use Cloudflare Workers AI (Llama 3.1 8B) to extract search keywords from natural language query
 * This function is ONLY called when Smart Search is enabled by the user.
 * If Smart Search is off (or offline), the client uses local fuzzy search instead.
 */
async function extractSearchQuery(userMessage, conversationHistory = []) {
  // For short queries (≤3 words), skip AI and use synonym expansion
  // This saves an API call for simple searches like "food stamps" or "senior transportation"
  const wordCount = userMessage.trim().split(/\s+/).length;
  if (wordCount <= 3) {
    console.log(`Short query (${wordCount} words), using synonym expansion only`);
    return expandQueryWithSynonyms(userMessage);
  }

  // Fallback if Cloudflare Workers AI not configured
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
    console.log('Cloudflare Workers AI not configured, falling back to synonym expansion');
    return expandQueryWithSynonyms(userMessage);
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`;

  const extractionPrompt = `You help extract search keywords from natural language queries about assistance programs.

User query: "${userMessage}"

Extract and return ONLY a space-separated list of search terms that would match relevant programs. Include:
- The main topic (childcare, food, housing, transportation, utilities, healthcare, etc.)
- Target demographics if mentioned (seniors, veterans, children, disabled, low-income, infant, youth, elderly, 65+, etc.)
- Specific program types (subsidy, discount, free, emergency, assistance, etc.)
- Related terms that programs might use

Examples:
- "I need affordable childcare for my infant" → "childcare infant child care affordable subsidy preschool daycare baby toddler"
- "I'm a senior who needs help with transportation" → "senior seniors elderly 65+ transportation transit bus ride discount paratransit clipper"
- "Help paying electric bill" → "utility utilities electric energy bill payment assistance LIHEAP PG&E low-income"
- "I'm homeless and need a place to stay tonight" → "homeless shelter housing emergency temporary bed sleep unhoused"
- "Food assistance for my family" → "food groceries meals CalFresh SNAP food bank pantry family low-income nutrition"
- "What programs help with rent if I lost my job" → "rent housing assistance unemployment job loss emergency rental aid"

Return ONLY the keywords separated by spaces, nothing else:`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CF_API_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content:
              'You extract search keywords from queries. Return only space-separated keywords, nothing else.',
          },
          { role: 'user', content: extractionPrompt },
        ],
        max_tokens: 60,
        temperature: 0.1, // Very low for consistent extraction
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudflare Workers AI error:', errorText);
      return expandQueryWithSynonyms(userMessage);
    }

    const data = await response.json();
    const keywords = data.result?.response?.trim() || '';

    if (keywords) {
      console.log(`Llama 3.1 extracted keywords: "${keywords}"`);
      return keywords;
    }

    return expandQueryWithSynonyms(userMessage);
  } catch (error) {
    console.error('Keyword extraction error:', error);
    return expandQueryWithSynonyms(userMessage);
  }
}

module.exports = async function (context, req) {
  const logger = createLogger(context, 'smart-assistant');
  const timer = createTimer();

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    context.res = {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    };
    return;
  }

  // CORS headers for all responses
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    logger.logRequest(req);

    // Validate configuration (Cloudflare Workers AI for LLM, Azure Search for retrieval)
    if (!CF_ACCOUNT_ID || !CF_API_TOKEN) {
      logger.warn('Cloudflare Workers AI not configured, using synonym expansion fallback');
    }
    if (!AZURE_SEARCH_KEY) {
      logger.error('Azure Search not configured', { status: 503 });
      context.res = {
        status: 503,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Smart assistant search is not configured. Please try again later.',
        }),
      };
      return;
    }

    // Parse request
    const { message, conversationHistory = [] } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      logger.warn('Invalid request: missing message', { status: 400 });
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: 'Please provide a message.',
        }),
      };
      return;
    }

    const userMessage = message.trim().slice(0, 500);
    logger.info('Processing query', {
      queryLength: userMessage.length,
      wordCount: userMessage.split(/\s+/).length,
      hasHistory: conversationHistory.length > 0,
    });

    // Extract location from query (zip code, city, or county) - no AI needed
    const location = extractLocation(userMessage);
    if (location) {
      logger.info('Location detected', { location });
    }

    // Search for relevant programs using AI-extracted keywords (for >3 word queries)
    const searchQuery = await extractSearchQuery(userMessage, conversationHistory);
    logger.debug('Search query extracted', {
      original: userMessage,
      expanded: searchQuery,
    });

    const programs = await searchPrograms(searchQuery, location);
    logger.info('Search completed', {
      programsFound: programs.length,
      searchQuery,
      hasLocation: !!location,
    });

    // Return structured program cards directly (no AI response formatting needed)
    const programCards = formatProgramsAsCards(programs);

    const responseBody = {
      programs: programCards,
      programsFound: programs.length,
      searchQuery: searchQuery,
      location: location || null,
    };

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: JSON.stringify(responseBody),
    };

    logger.logResponse(200, responseBody, timer.elapsed());
  } catch (error) {
    logger.error('Smart assistant error', {
      ...extractErrorInfo(error),
      durationMs: timer.elapsed(),
    });

    context.res = {
      status: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: 'Something went wrong. Please try again.',
      }),
    };
  }
};
