/**
 * Sync program data to Azure AI Search index
 * Run: node scripts/sync-search-index.cjs
 *
 * Required environment variables:
 * - AZURE_SEARCH_ENDPOINT: https://baynavigator-search.search.windows.net
 * - AZURE_SEARCH_KEY: Admin key for the search service
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT || 'https://baynavigator-search.search.windows.net';
const SEARCH_KEY = process.env.AZURE_SEARCH_KEY;
const INDEX_NAME = 'programs';

// Area ID mapping (area name -> standardized ID)
const areaMapping = {
  'Alameda County': 'alameda-county',
  'Contra Costa County': 'contra-costa-county',
  'Marin County': 'marin-county',
  'Napa County': 'napa-county',
  'San Francisco': 'san-francisco',
  'San Mateo County': 'san-mateo-county',
  'Santa Clara County': 'santa-clara-county',
  'Solano County': 'solano-county',
  'Sonoma County': 'sonoma-county',
  'Bay Area': 'bay-area',
  'Statewide': 'statewide',
  'Nationwide': 'nationwide',
};

async function loadPrograms() {
  const dataDir = path.join(__dirname, '..', 'src', 'data');
  const programs = [];

  // Skip non-program files
  const skipFiles = ['groups.yml', 'cities.yml'];

  const files = fs.readdirSync(dataDir).filter(f =>
    f.endsWith('.yml') && !skipFiles.includes(f)
  );

  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
    const data = yaml.load(content);

    if (Array.isArray(data)) {
      programs.push(...data);
    }
  }

  return programs;
}

function transformProgram(program) {
  // Normalize area to array of IDs
  let areas = [];
  if (program.area) {
    const areaNames = Array.isArray(program.area) ? program.area : [program.area];
    areas = areaNames.map(name => areaMapping[name] || name.toLowerCase().replace(/\s+/g, '-'));
  }

  return {
    id: program.id,
    name: program.name,
    category: program.category,
    description: program.description || '',
    whatTheyOffer: program.what_they_offer || '',
    howToGetIt: program.how_to_get_it || '',
    groups: program.groups || [],
    areas: areas,
    city: program.city || null,
    website: program.link || '',
    phone: program.phone || null,
    requirements: program.requirements || null,
    source: program.source || 'local', // 'federal' for USAGov programs
    agency: program.agency || null, // Federal agency name if applicable
  };
}

async function uploadToSearch(documents) {
  const batchSize = 100;
  let uploaded = 0;

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);

    const response = await fetch(
      `${SEARCH_ENDPOINT}/indexes/${INDEX_NAME}/docs/index?api-version=2023-11-01`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': SEARCH_KEY,
        },
        body: JSON.stringify({
          value: batch.map(doc => ({
            '@search.action': 'mergeOrUpload',
            ...doc,
          })),
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to upload batch: ${error}`);
    }

    const result = await response.json();
    uploaded += result.value.filter(r => r.status).length;
    console.log(`Uploaded ${uploaded}/${documents.length} documents...`);
  }

  return uploaded;
}

async function main() {
  if (!SEARCH_KEY) {
    console.error('Error: AZURE_SEARCH_KEY environment variable is required');
    process.exit(1);
  }

  console.log('Loading programs from YAML files...');
  const programs = await loadPrograms();
  console.log(`Found ${programs.length} programs`);

  console.log('Transforming programs for search index...');
  const documents = programs.map(transformProgram);

  console.log('Uploading to Azure AI Search...');
  const uploaded = await uploadToSearch(documents);

  console.log(`Successfully synced ${uploaded} programs to search index`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
