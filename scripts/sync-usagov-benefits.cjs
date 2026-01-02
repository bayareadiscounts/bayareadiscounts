#!/usr/bin/env node
/**
 * Sync USAGov Benefit Finder data into BayNavigator
 *
 * Fetches federal benefits from usa.gov and converts them to our YAML format.
 * These are federal programs available nationwide (including the Bay Area).
 *
 * Source: https://www.usa.gov/s3/files/benefit-finder/api/life-event/all_benefits.json
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const USAGOV_API = 'https://www.usa.gov/s3/files/benefit-finder/api/life-event/all_benefits.json';
const OUTPUT_FILE = path.join(__dirname, '../src/data/federal-benefits.yml');

// Map USAGov agencies to our category system
const AGENCY_TO_CATEGORY = {
  'Social Security Administration (SSA)': 'Finance',
  'Veterans Affairs Department (VA)': 'Community',
  'Department of Defense (DOD)': 'Community',
  'Centers for Medicare and Medicaid (CMS)': 'Health',
  'Federal Emergency Management Agency (FEMA)': 'Community',
  'Department of Labor (DOL)': 'Finance',
  'Department of Justice (DOJ)': 'Legal',
  'Department of Housing and Urban Development (HUD)': 'Housing',
  'Internal Revenue Service (IRS)': 'Finance',
  'Department of Interior (DOI) - Indian Affairs': 'Community',
  'Library of Congress (LOC)': 'Education',
  'Federal Retirement Thrift Investment Board (FRTIB)': 'Finance',
};

// Map eligibility criteria to our target groups
const CRITERIA_TO_GROUPS = {
  'applicant_served_in_active_military': 'Veterans',
  'applicant_service_disability': 'Veterans',
  'applicant_disability': 'People with Disabilities',
  'applicant_ability_to_work': 'People with Disabilities',
  'applicant_american_indian': 'Native Americans',
  'applicant_income': 'Low Income',
  'applicant_dolo': 'Survivors',
  'deceased_': 'Survivors',
};

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function generateId(title, agency) {
  const agencyShort = agency
    .replace(/\([^)]+\)/g, '')
    .trim()
    .split(' ')
    .slice(0, 2)
    .join('-')
    .toLowerCase();

  const titleSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

  return `federal-${agencyShort}-${titleSlug}`;
}

function extractGroups(eligibility) {
  const groups = new Set();

  for (const criterion of eligibility) {
    const key = criterion.criteriaKey || '';

    for (const [pattern, group] of Object.entries(CRITERIA_TO_GROUPS)) {
      if (key.includes(pattern) || key.startsWith(pattern)) {
        groups.add(group);
      }
    }

    // Check for age-related criteria
    if (key.includes('date_of_birth') || key.includes('age')) {
      // Could be seniors or children depending on context
      const label = (criterion.label || '').toLowerCase();
      if (label.includes('65') || label.includes('senior') || label.includes('retire')) {
        groups.add('Seniors');
      }
      if (label.includes('child') || label.includes('under 18')) {
        groups.add('Families');
      }
    }
  }

  return Array.from(groups);
}

function transformBenefit(benefitWrapper) {
  const benefit = benefitWrapper.benefit;
  if (!benefit || !benefit.title) return null;

  const agency = benefit.agency || {};
  const agencyTitle = (agency.title || 'Federal Government').trim();

  const category = AGENCY_TO_CATEGORY[agencyTitle] || 'Community';
  const groups = extractGroups(benefit.eligibility || []);

  // Add general groups based on title/summary
  const titleLower = benefit.title.toLowerCase();
  const summaryLower = (benefit.summary || '').toLowerCase();

  if (titleLower.includes('veteran') || summaryLower.includes('veteran')) {
    if (!groups.includes('Veterans')) groups.push('Veterans');
  }
  if (titleLower.includes('disability') || titleLower.includes('disabled') || summaryLower.includes('disability')) {
    if (!groups.includes('People with Disabilities')) groups.push('People with Disabilities');
  }
  if (titleLower.includes('senior') || titleLower.includes('retire') || titleLower.includes('medicare')) {
    if (!groups.includes('Seniors')) groups.push('Seniors');
  }
  if (titleLower.includes('child') || summaryLower.includes('child')) {
    if (!groups.includes('Families')) groups.push('Families');
  }
  if (titleLower.includes('survivor') || summaryLower.includes('survivor') || summaryLower.includes('death')) {
    if (!groups.includes('Survivors')) groups.push('Survivors');
  }

  // Build eligibility description
  const eligibilityItems = (benefit.eligibility || [])
    .map(e => e.label)
    .filter(Boolean)
    .slice(0, 5);

  const howToGetIt = eligibilityItems.length > 0
    ? `Eligibility requirements:\n${eligibilityItems.map(e => `- ${e}`).join('\n')}\n\nVisit the official website or call for more information.`
    : 'Visit the official website or call for more information about eligibility and how to apply.';

  return {
    id: generateId(benefit.title, agencyTitle),
    name: benefit.title,
    category: category,
    area: 'Nationwide',
    description: stripHtml(benefit.summary) || `Federal benefit program administered by ${agencyTitle}.`,
    whatTheyOffer: stripHtml(agency.summary || agency.lede || ''),
    howToGetIt: howToGetIt,
    link: benefit.SourceLink || '',
    linkText: 'Official Website',
    groups: groups.length > 0 ? groups : ['Everyone'],
    source: 'federal',
    agency: agencyTitle,
  };
}

async function syncBenefits() {
  console.log('Fetching USAGov benefits data...');

  try {
    const response = await fetch(USAGOV_API);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const benefits = data?.data?.benefits || [];

    console.log(`Found ${benefits.length} federal benefits`);

    const programs = benefits
      .map(transformBenefit)
      .filter(Boolean);

    console.log(`Transformed ${programs.length} programs`);

    // Generate sync date for verification
    const syncDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // Generate YAML content - format matches existing files (array, not object with programs key)
    const yamlContent = `# Federal Benefits from USAGov
# Auto-generated from https://www.usa.gov/benefit-finder
# Last synced: ${new Date().toISOString()}
#
# These are federal programs available nationwide, including the Bay Area.
# Source: USA.gov Benefit Finder API
#
# DO NOT EDIT MANUALLY - This file is regenerated by sync-usagov-benefits.cjs

${programs.map(p => {
  const lines = [
    `- id: ${p.id}`,
    `  name: ${p.name}`,
    `  category: ${p.category}`,
    `  area: ${p.area}`,
    `  source: federal`,
    `  agency: ${p.agency}`,
    `  verified_by: USA.gov`,
    `  verified_date: '${syncDate}'`,
  ];

  if (p.groups && p.groups.length > 0) {
    lines.push(`  groups:`);
    p.groups.forEach(g => lines.push(`    - ${g.toLowerCase().replace(/ /g, '-')}`));
  }

  // Use > for folded scalar (single line)
  lines.push(`  description: >`);
  lines.push(`    ${p.description}`);

  if (p.whatTheyOffer) {
    lines.push(`  what_they_offer: >`);
    lines.push(`    ${p.whatTheyOffer}`);
  }

  if (p.howToGetIt) {
    lines.push(`  how_to_get_it: |`);
    p.howToGetIt.split('\n').forEach(line => {
      lines.push(`    ${line}`);
    });
  }

  if (p.link) {
    lines.push(`  link: ${p.link}`);
    lines.push(`  link_text: ${p.linkText}`);
  }

  return lines.join('\n');
}).join('\n\n')}
`;

    // Write to file
    fs.writeFileSync(OUTPUT_FILE, yamlContent, 'utf8');
    console.log(`Written to ${OUTPUT_FILE}`);

    // Summary
    const categories = {};
    const groupCounts = {};
    programs.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
      p.groups.forEach(g => {
        groupCounts[g] = (groupCounts[g] || 0) + 1;
      });
    });

    console.log('\nBy category:');
    Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });

    console.log('\nBy target group:');
    Object.entries(groupCounts).sort((a, b) => b[1] - a[1]).forEach(([group, count]) => {
      console.log(`  ${group}: ${count}`);
    });

    return programs.length;

  } catch (error) {
    console.error('Error syncing benefits:', error);
    process.exit(1);
  }
}

syncBenefits();
