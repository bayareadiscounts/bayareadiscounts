/**
 * Congress Lookup Azure Function
 * Proxies requests to Congress.gov API, CA Legislature API, and geocoding services
 * Returns member info for a given state and congressional/state district
 */

const https = require('https');

const CONGRESS_API_KEY = process.env.CONGRESS_API_KEY;
const CONGRESS_API_BASE = 'https://api.congress.gov/v3';
const CA_LEGISLATURE_BASE = 'https://findyourrep.legislature.ca.gov';
const CENSUS_GEOCODER_BASE = 'https://geocoding.geo.census.gov/geocoder/geographies/address';
const ARCGIS_DISTRICTS_BASE = 'https://services5.arcgis.com/0CGHmi5SBMvfD65u/arcgis/rest/services/AD_SD_2021_DistrictOverlay/FeatureServer/2/query';

// Bay Area County Supervisor Data (2025)
// FIPS codes: 06075=SF, 06081=San Mateo, 06085=Santa Clara, 06001=Alameda,
//             06013=Contra Costa, 06041=Marin, 06097=Sonoma, 06055=Napa, 06095=Solano
const COUNTY_SUPERVISORS = {
  '06075': { // San Francisco
    name: 'San Francisco',
    arcgis: 'https://services.arcgis.com/Zs2aNLFN00jrS4gG/arcgis/rest/services/Current_Supervisor_Districts/FeatureServer/0',
    districtField: 'supervisor',
    supervisors: {
      1: { name: 'Connie Chan', website: 'https://sfbos.org/supervisor-chan-district-1' },
      2: { name: 'Stephen Sherrill', website: 'https://sfbos.org/supervisor-sherrill-district-2' },
      3: { name: 'Danny Sauter', website: 'https://sfbos.org/supervisor-sauter-district-3' },
      4: { name: 'Alan Wong', website: 'https://sfbos.org/supervisor-wong-district-4' },
      5: { name: 'Bilal Mahmood', website: 'https://sfbos.org/supervisor-mahmood-district-5' },
      6: { name: 'Matt Dorsey', website: 'https://sfbos.org/supervisor-dorsey-district-6' },
      7: { name: 'Myrna Melgar', website: 'https://sfbos.org/supervisor-melgar-district-7' },
      8: { name: 'Rafael Mandelman', website: 'https://sfbos.org/supervisor-mandelman-district-8' },
      9: { name: 'Jackie Fielder', website: 'https://sfbos.org/supervisor-fielder-district-9' },
      10: { name: 'Shamann Walton', website: 'https://sfbos.org/supervisor-walton-district-10' },
      11: { name: 'Chyanne Chen', website: 'https://sfbos.org/supervisor-chen-district-11' }
    }
  },
  '06081': { // San Mateo
    name: 'San Mateo County',
    arcgis: 'https://services.arcgis.com/yq3FgOI44hYHAFVZ/arcgis/rest/services/Supervisor_Districts/FeatureServer/0',
    districtField: 'District',
    supervisors: {
      1: { name: 'Jackie Speier', website: 'https://www.smcgov.org/district-1' },
      2: { name: 'Noelia Corzo', website: 'https://www.smcgov.org/district-2' },
      3: { name: 'Ray Mueller', website: 'https://www.smcgov.org/district-3' },
      4: { name: 'Lisa Gauthier', website: 'https://www.smcgov.org/district-4' },
      5: { name: 'David Canepa', website: 'https://www.smcgov.org/district-5' }
    }
  },
  '06085': { // Santa Clara
    name: 'Santa Clara County',
    arcgis: 'https://services1.arcgis.com/4QPaqCJqF1UIaPbN/arcgis/rest/services/Santa_Clara_County_Supervisorial_Districts/FeatureServer/0',
    districtField: 'DISTRICT',
    supervisors: {
      1: { name: 'Sylvia Arenas', website: 'https://supervisorarenas.org/' },
      2: { name: 'Cindy Chavez', website: 'https://www.sccgov.org/sites/d2/' },
      3: { name: 'Otto Lee', website: 'https://www.sccgov.org/sites/d3/' },
      4: { name: 'Susan Ellenberg', website: 'https://www.sccgov.org/sites/d4/' },
      5: { name: 'Joe Simitian', website: 'https://supervisorsimitian.org/' }
    }
  },
  '06001': { // Alameda
    name: 'Alameda County',
    arcgis: 'https://services5.arcgis.com/ROBnTHSNjoZ2Wm1P/arcgis/rest/services/Board_of_Supervisors_District_Boundaries/FeatureServer/0',
    districtField: 'DISTRICT_ID',
    districtMapping: { 644: 1, 645: 2, 646: 3, 647: 4, 648: 5 },
    supervisors: {
      1: { name: 'David Haubert', website: 'https://bos.alamedacountyca.gov/district-1/' },
      2: { name: 'Elisa Márquez', website: 'https://bos.alamedacountyca.gov/district-2/' },
      3: { name: 'Rebecca Kaplan', website: 'https://bos.alamedacountyca.gov/district-3/' },
      4: { name: 'Nate Miley', website: 'https://bos.alamedacountyca.gov/district-4/' },
      5: { name: 'Keith Carson', website: 'https://bos.alamedacountyca.gov/district-5/' }
    }
  },
  '06013': { // Contra Costa
    name: 'Contra Costa County',
    arcgis: 'https://services3.arcgis.com/42Dx6OWonqK9LoEE/arcgis/rest/services/BOS_Find_My_Supervisor/FeatureServer/0',
    districtField: 'SUP_DIST',
    supervisors: {
      1: { name: 'John Gioia', website: 'https://www.contracosta.ca.gov/5216/District-1-Supervisor-John-M-Gioia', phone: '510-942-2220' },
      2: { name: 'Candace Andersen', website: 'https://www.contracosta.ca.gov/4668/District-2-Supervisor-Candace-Andersen', phone: '925-655-2300' },
      3: { name: 'Diane Burgis', website: 'https://www.contracosta.ca.gov/6437/District-3-Supervisor-Diane-Burgis', phone: '925-655-2330' },
      4: { name: 'Ken Carlson', website: 'https://www.contracosta.ca.gov/6291/District-4-Supervisor-Ken-Carlson', phone: '925-655-2350' },
      5: { name: 'Federal Glover', website: 'https://www.contracosta.ca.gov/781/District-5-Supervisor-Federal-Glover', phone: '925-608-4200' }
    }
  },
  '06041': { // Marin
    name: 'Marin County',
    arcgis: 'https://gis.marincounty.gov/server/rest/services/PARCEL_BASED/SUPERVISOR_DIST/FeatureServer/0',
    districtField: 'SUPERVISOR_DIST',
    supervisors: {
      1: { name: 'Mary Sackett', website: 'https://www.marincounty.gov/departments/county-administrator/board-of-supervisors/district-1' },
      2: { name: 'Brian Colbert', website: 'https://www.marincounty.gov/departments/county-administrator/board-of-supervisors/district-2' },
      3: { name: 'Stephanie Moulton-Peters', website: 'https://www.marincounty.gov/departments/county-administrator/board-of-supervisors/district-3' },
      4: { name: 'Dennis Rodoni', website: 'https://www.marincounty.gov/departments/county-administrator/board-of-supervisors/district-4' },
      5: { name: 'Eric Lucan', website: 'https://www.marincounty.gov/departments/county-administrator/board-of-supervisors/district-5' }
    }
  },
  '06097': { // Sonoma
    name: 'Sonoma County',
    arcgis: 'https://services1.arcgis.com/P5Mv5GY5S66M8Z1Q/arcgis/rest/services/Supervisor_Districts/FeatureServer/0',
    districtField: 'DISTRICT',
    supervisors: {
      1: { name: 'Rebecca Hermosillo', website: 'https://sonomacounty.ca.gov/first-district' },
      2: { name: 'David Rabbitt', website: 'https://sonomacounty.ca.gov/second-district' },
      3: { name: 'Chris Coursey', website: 'https://sonomacounty.ca.gov/third-district' },
      4: { name: 'James Gore', website: 'https://sonomacounty.ca.gov/fourth-district' },
      5: { name: 'Lynda Hopkins', website: 'https://sonomacounty.ca.gov/fifth-district' }
    }
  },
  '06055': { // Napa
    name: 'Napa County',
    arcgis: 'https://gis.countyofnapa.org/arcgis/rest/services/Hosted/Supervisor_Districts_2022/FeatureServer/0',
    districtField: 'sup_dist',
    supervisors: {
      1: { name: 'Joelle Gallagher', website: 'https://www.countyofnapa.org/1350/District-1' },
      2: { name: 'Liz Alessio', website: 'https://www.countyofnapa.org/1358/District-2' },
      3: { name: 'Anne Cottrell', website: 'https://www.countyofnapa.org/1366/District-3' },
      4: { name: 'Amber Manfree', website: 'https://www.countyofnapa.org/1372/District-4' },
      5: { name: 'Belia Ramos', website: 'https://www.countyofnapa.org/1379/District-5' }
    }
  },
  '06095': { // Solano
    name: 'Solano County',
    arcgis: 'https://services2.arcgis.com/SCn6czzcqKAFwdGU/arcgis/rest/services/BOS_District_Boundaries_2021/FeatureServer/0',
    districtField: 'district',
    supervisors: {
      1: { name: 'Cassandra James', website: 'https://www.solanocounty.gov/depts/bos/district1/' },
      2: { name: 'Monica Brown', website: 'https://www.solanocounty.gov/depts/bos/district2/' },
      3: { name: 'Wanda Williams', website: 'https://www.solanocounty.gov/depts/bos/district3/' },
      4: { name: 'John Vasquez', website: 'https://www.solanocounty.gov/depts/bos/district4/' },
      5: { name: 'Mitch Mashburn', website: 'https://www.solanocounty.gov/depts/bos/district5/' }
    }
  }
};

// Custom fetch for CA Legislature (handles SSL issues)
function fetchCALegislature(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      rejectUnauthorized: false, // CA Legislature has SSL issues
      headers: {
        'User-Agent': 'BayNavigator/1.0'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ ok: res.statusCode === 200, status: res.statusCode, text: () => Promise.resolve(data) }));
    });
    req.on('error', reject);
  });
}

module.exports = async function (context, req) {
  // CORS headers
  context.res = {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Cache-Control': 'public, max-age=86400' // Cache for 24 hours (reps don't change often)
    }
  };

  if (req.method === 'OPTIONS') {
    context.res.status = 204;
    return;
  }

  try {
    const state = req.query.state || 'CA';
    const district = req.query.district;
    const type = req.query.type || 'house'; // 'house', 'senate', 'state-assembly', 'state-senate', 'geocode'

    // Handle geocoding (address to districts)
    if (type === 'geocode') {
      const street = req.query.street;
      const city = req.query.city;
      const zip = req.query.zip;

      if (!street || !city || !zip) {
        context.res.status = 400;
        context.res.body = JSON.stringify({ error: 'street, city, and zip are required' });
        return;
      }

      const result = await geocodeAddress(street, city, zip, context);
      context.res.body = JSON.stringify(result);
      return;
    }

    // Handle CA State Legislature lookups (no API key needed)
    if (type === 'state-assembly' || type === 'state-senate') {
      const house = type === 'state-assembly' ? 'AD' : 'SD';
      const result = await getCALegislator(house, district, context);
      context.res.body = JSON.stringify(result);
      return;
    }

    // Handle county supervisor lookup
    if (type === 'county-supervisor') {
      const countyFips = req.query.county;
      const x = parseFloat(req.query.x);
      const y = parseFloat(req.query.y);

      if (!countyFips || isNaN(x) || isNaN(y)) {
        context.res.status = 400;
        context.res.body = JSON.stringify({ error: 'county FIPS and coordinates (x, y) are required' });
        return;
      }

      const result = await getCountySupervisor(countyFips, x, y, context);
      context.res.body = JSON.stringify(result);
      return;
    }

    // Federal lookups require API key
    if (!CONGRESS_API_KEY) {
      context.res.status = 500;
      context.res.body = JSON.stringify({ error: 'Congress API key not configured' });
      return;
    }

    let members = [];

    if (type === 'senate') {
      // Get both CA senators
      members = await getSenatorsForState(state, context);
    } else if (district) {
      // Get House rep for specific district
      members = await getHouseRepForDistrict(state, district, context);
    } else {
      context.res.status = 400;
      context.res.body = JSON.stringify({ error: 'District required for House lookup' });
      return;
    }

    context.res.body = JSON.stringify({
      state,
      district: district || null,
      type,
      members
    });
  } catch (error) {
    context.log.error('Congress lookup error:', error);
    context.res.status = 500;
    context.res.body = JSON.stringify({ error: 'Failed to fetch member data' });
  }
};

/**
 * Get CA State Legislator info (Assembly or Senate)
 */
async function getCALegislator(house, district, context) {
  try {
    const apiUrl = `${CA_LEGISLATURE_BASE}/GetLegislatorInfo.php?House=${house}&districtNum=${district}`;
    context.log('Fetching CA legislator from:', apiUrl);

    const response = await fetchCALegislature(apiUrl);

    context.log('CA Legislature response status:', response.status);

    if (!response.ok) {
      throw new Error(`CA Legislature API error: ${response.status}`);
    }

    const html = await response.text();
    context.log('CA Legislature response:', html.substring(0, 200));

    // Parse: <a href='http://assembly.ca.gov/ad17' target='_blank'>Assemblymember Matt Haney</a>-DEM
    const match = html.match(/<a href='([^']+)'[^>]*>([^<]+)<\/a>-?(\w*)/);

    if (!match) {
      return { error: 'Could not parse legislator info', raw: html };
    }

    const [, websiteUrl, name, party] = match;
    const partyAbbrev = party === 'DEM' ? 'D' : party === 'REP' ? 'R' : party;

    // Generate photo URL(s)
    // Assembly: consistent URL pattern
    // Senate: varies by senator's website - provide multiple options for frontend to try
    const paddedDistrict = String(district).padStart(2, '0');
    let photoUrl = null;
    let photoUrlFallbacks = null;

    if (house === 'AD') {
      photoUrl = `https://webapi.assembly.ca.gov/district-media/assets/members/assembly_member_${paddedDistrict}.jpg`;
    } else {
      // Senate sites have inconsistent photo locations - try multiple patterns
      const senateBase = `https://sd${paddedDistrict}.senate.ca.gov/sites/sd${paddedDistrict}.senate.ca.gov/files`;
      photoUrl = `${senateBase}/images/sd${paddedDistrict}_headshot.jpg`;
      photoUrlFallbacks = [
        `${senateBase}/website/sd${paddedDistrict}_headshot.jpeg`,
        `${senateBase}/website/sd${paddedDistrict}_headshot.jpg`,
        `${senateBase}/images/sd${paddedDistrict}_headshot.jpeg`
      ];
    }

    return {
      house,
      district,
      name: name.trim(),
      party,
      partyAbbrev,
      officialWebsite: websiteUrl,
      photoUrl,
      photoUrlFallbacks,
      termLength: house === 'AD' ? '2-year term' : '4-year term'
    };
  } catch (error) {
    context.log.error(`Error getting CA legislator for ${house}-${district}:`, error.message, error.stack);
    return { error: 'Failed to fetch CA legislator info', details: error.message };
  }
}

/**
 * Get current House representative for a district
 */
async function getHouseRepForDistrict(state, district, context) {
  // Get current members for this state/district
  const url = `${CONGRESS_API_BASE}/member/${state}/${district}?api_key=${CONGRESS_API_KEY}&currentMember=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }

  const data = await response.json();
  const members = data.members || [];

  // Filter to current House members only
  const currentHouseMembers = members.filter(m => {
    const terms = m.terms?.item || [];
    // Check if they have a current House term (no endYear means current)
    return terms.some(t => t.chamber === 'House of Representatives' && !t.endYear);
  });

  // Get detailed info for each member
  const detailedMembers = await Promise.all(
    currentHouseMembers.slice(0, 1).map(m => getMemberDetails(m.bioguideId, context))
  );

  return detailedMembers.filter(Boolean);
}

/**
 * Get both senators for a state
 */
async function getSenatorsForState(state, context) {
  const url = `${CONGRESS_API_BASE}/member/${state}?api_key=${CONGRESS_API_KEY}&currentMember=true&limit=100`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Congress API error: ${response.status}`);
  }

  const data = await response.json();
  const members = data.members || [];

  // Filter to current Senators only
  const currentSenators = members.filter(m => {
    const terms = m.terms?.item || [];
    return terms.some(t => t.chamber === 'Senate' && !t.endYear);
  });

  // Get detailed info for each senator
  const detailedMembers = await Promise.all(
    currentSenators.slice(0, 2).map(m => getMemberDetails(m.bioguideId, context))
  );

  return detailedMembers.filter(Boolean);
}

/**
 * Get detailed member info by bioguideId
 */
async function getMemberDetails(bioguideId, context) {
  try {
    const url = `${CONGRESS_API_BASE}/member/${bioguideId}?api_key=${CONGRESS_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      context.log.warn(`Failed to get details for ${bioguideId}`);
      return null;
    }

    const data = await response.json();
    const member = data.member;

    if (!member) return null;

    // Get current term info
    const terms = member.terms || [];
    const currentTerm = terms.find(t => !t.endYear) || terms[terms.length - 1];

    // Calculate next election year
    let nextElection = null;
    if (currentTerm) {
      if (currentTerm.chamber === 'Senate') {
        // Senators serve 6-year terms
        nextElection = currentTerm.startYear + 6;
      } else {
        // House members serve 2-year terms, next election is always next even year
        const currentYear = new Date().getFullYear();
        nextElection = currentYear % 2 === 0 ? currentYear : currentYear + 1;
      }
    }

    // Get party from party history
    const partyHistory = member.partyHistory || [];
    const currentParty = partyHistory.find(p => !p.endYear) || partyHistory[partyHistory.length - 1];

    return {
      bioguideId: member.bioguideId,
      name: member.directOrderName || member.invertedOrderName,
      firstName: member.firstName,
      lastName: member.lastName,
      party: currentParty?.partyName || 'Unknown',
      partyAbbrev: getPartyAbbrev(currentParty?.partyName),
      state: member.state,
      district: currentTerm?.district || null,
      chamber: currentTerm?.chamber || null,
      imageUrl: member.depiction?.imageUrl || null,
      officialWebsite: member.officialWebsiteUrl || null,
      startYear: currentTerm?.startYear || null,
      nextElection,
      // Additional contact info if available
      addressInformation: member.addressInformation || null
    };
  } catch (error) {
    context.log.error(`Error getting member details for ${bioguideId}:`, error);
    return null;
  }
}

function getPartyAbbrev(partyName) {
  if (!partyName) return '?';
  const lower = partyName.toLowerCase();
  if (lower.includes('democrat')) return 'D';
  if (lower.includes('republican')) return 'R';
  if (lower.includes('independent')) return 'I';
  return partyName.charAt(0);
}

/**
 * Geocode an address and return all district information
 */
async function geocodeAddress(street, city, zip, context) {
  try {
    // Step 1: Census Geocoder for address coordinates, congressional district, and county
    // layers=all returns all geographies including Counties
    const censusUrl = `${CENSUS_GEOCODER_BASE}?street=${encodeURIComponent(street)}&city=${encodeURIComponent(city)}&state=CA&zip=${zip}&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=json`;
    context.log('Fetching Census Geocoder:', censusUrl);

    const censusResponse = await fetch(censusUrl);
    if (!censusResponse.ok) {
      throw new Error(`Census Geocoder error: ${censusResponse.status}`);
    }

    const censusData = await censusResponse.json();
    const matches = censusData?.result?.addressMatches;

    if (!matches || matches.length === 0) {
      return { error: 'Address not found. Please check and try again.' };
    }

    const match = matches[0];
    const coordinates = match.coordinates;
    const formattedAddress = match.matchedAddress;

    // Get congressional district and county
    const geographies = match.geographies || {};
    const congressionalDistricts = geographies['119th Congressional Districts'] || [];
    const congressDistrict = congressionalDistricts[0]?.BASENAME || null;

    // Get county FIPS (state + county = e.g., "06075" for San Francisco)
    const counties = geographies['Counties'] || [];
    const countyFips = counties[0]?.GEOID || null;
    const countyName = counties[0]?.BASENAME || null;

    if (!congressDistrict) {
      return { error: 'Could not determine congressional district for this address.' };
    }

    // Step 2: ArcGIS for CA state districts
    const arcgisParams = new URLSearchParams({
      geometry: JSON.stringify({
        x: coordinates.x,
        y: coordinates.y,
        spatialReference: { wkid: 4269 }
      }),
      geometryType: 'esriGeometryPoint',
      returnGeometry: 'false',
      outFields: 'AD_2021,SD_2021',
      f: 'json'
    });

    const arcgisUrl = `${ARCGIS_DISTRICTS_BASE}?${arcgisParams}`;
    context.log('Fetching ArcGIS districts:', arcgisUrl);

    const arcgisResponse = await fetch(arcgisUrl);
    if (!arcgisResponse.ok) {
      throw new Error(`ArcGIS error: ${arcgisResponse.status}`);
    }

    const arcgisData = await arcgisResponse.json();
    const features = arcgisData?.features;

    if (!features || features.length === 0) {
      return { error: 'Could not determine state legislative districts for this address.' };
    }

    const stateDistricts = features[0].attributes;
    const assemblyDistrict = stateDistricts.AD_2021?.replace(/^0+/, '');
    const senateDistrict = stateDistricts.SD_2021?.replace(/^0+/, '');

    return {
      formattedAddress,
      coordinates,
      congressDistrict,
      assemblyDistrict,
      senateDistrict,
      countyFips,
      countyName
    };
  } catch (error) {
    context.log.error('Geocoding error:', error);
    return { error: error.message || 'Failed to geocode address' };
  }
}

/**
 * Get county supervisor for a given county and coordinates
 */
async function getCountySupervisor(countyFips, x, y, context) {
  try {
    const county = COUNTY_SUPERVISORS[countyFips];

    if (!county) {
      return { error: 'County not supported', countyFips };
    }

    // Query the county's ArcGIS layer for the supervisor district
    const arcgisParams = new URLSearchParams({
      geometry: JSON.stringify({
        x: x,
        y: y,
        spatialReference: { wkid: 4269 }
      }),
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      returnGeometry: 'false',
      outFields: '*',
      f: 'json'
    });

    const arcgisUrl = `${county.arcgis}/query?${arcgisParams}`;
    context.log('Fetching county supervisor district:', arcgisUrl);

    const arcgisResponse = await fetch(arcgisUrl);
    if (!arcgisResponse.ok) {
      throw new Error(`ArcGIS error: ${arcgisResponse.status}`);
    }

    const arcgisData = await arcgisResponse.json();
    const features = arcgisData?.features;

    if (!features || features.length === 0) {
      return { error: 'Could not determine supervisor district for this location' };
    }

    const attrs = features[0].attributes;
    let districtNum = attrs[county.districtField];

    // Handle special district mappings (e.g., Alameda uses DISTRICT_ID 644-648)
    if (county.districtMapping && county.districtMapping[districtNum]) {
      districtNum = county.districtMapping[districtNum];
    }

    // Parse district number from string if needed (e.g., "District 1" -> 1)
    if (typeof districtNum === 'string') {
      const match = districtNum.match(/(\d+)/);
      if (match) {
        districtNum = parseInt(match[1], 10);
      }
    }

    const supervisor = county.supervisors[districtNum];

    if (!supervisor) {
      return {
        error: 'Supervisor not found for district',
        county: county.name,
        district: districtNum
      };
    }

    return {
      county: county.name,
      countyFips,
      district: districtNum,
      name: supervisor.name,
      website: supervisor.website,
      phone: supervisor.phone || null
    };
  } catch (error) {
    context.log.error('County supervisor lookup error:', error);
    return { error: error.message || 'Failed to lookup county supervisor' };
  }
}
