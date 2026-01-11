#!/usr/bin/env node
/**
 * Azure Translator Script for i18n Files
 *
 * Translates src/i18n/en.json to other languages using Azure Translator API.
 * Only translates strings that have changed since last run (incremental).
 *
 * Usage:
 *   AZURE_TRANSLATOR_KEY=xxx AZURE_TRANSLATOR_REGION=xxx node scripts/translate-i18n.cjs
 *
 * Environment variables:
 *   AZURE_TRANSLATOR_KEY    - Azure Translator API key
 *   AZURE_TRANSLATOR_REGION - Azure region (e.g., westus2)
 *
 * The script maintains a hash file (.i18n-hashes.json) to track which
 * strings have been translated, enabling incremental updates.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const I18N_DIR = path.join(__dirname, '..', 'src', 'i18n');
const HASH_FILE = path.join(__dirname, '..', '.i18n-hashes.json');
const SOURCE_LANG = 'en';

// Target languages (ISO 639-1 codes)
// Common Bay Area languages: Spanish, Chinese (Simplified), Vietnamese, Tagalog, Korean
const TARGET_LANGUAGES = ['es', 'zh-Hans', 'vi', 'tl', 'ko'];

// Azure Translator API endpoint
const TRANSLATOR_ENDPOINT = 'api.cognitive.microsofttranslator.com';

// Strings that should NOT be translated (brand names, technical terms, etc.)
const DO_NOT_TRANSLATE = [
  'Bay Navigator',
  'CalFresh',
  'Medi-Cal',
  'BenefitsCal',
  'GetCalFresh.org',
  'Bay Area Legal Aid',
  'LGBTQ+',
  '511.org',
  'Caltrans',
  'Azure Maps',
  '2-1-1',
  '911',
  '988',
];

/**
 * Create a hash of a string for change detection
 */
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(36);
}

/**
 * Flatten nested object to dot-notation keys
 */
function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

/**
 * Unflatten dot-notation keys back to nested object
 */
function unflattenObject(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const keys = key.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in current)) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
  }
  return result;
}

/**
 * Call Azure Translator API
 */
async function translateTexts(texts, targetLang, apiKey, region) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(texts.map((text) => ({ text })));

    const options = {
      hostname: TRANSLATOR_ENDPOINT,
      path: `/translate?api-version=3.0&from=${SOURCE_LANG}&to=${targetLang}`,
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`Azure Translator API error: ${res.statusCode} - ${data}`));
          return;
        }
        try {
          const result = JSON.parse(data);
          const translations = result.map((item) => item.translations[0].text);
          resolve(translations);
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

/**
 * Protect strings that shouldn't be translated
 */
function protectStrings(text) {
  let protected = text;
  const placeholders = [];

  DO_NOT_TRANSLATE.forEach((term, i) => {
    const placeholder = `[[DNT${i}]]`;
    if (protected.includes(term)) {
      protected = protected.split(term).join(placeholder);
      placeholders.push({ placeholder, term });
    }
  });

  // Also protect interpolation placeholders like {count}
  const interpolationRegex = /\{(\w+)\}/g;
  let match;
  let interpolationIndex = 0;
  while ((match = interpolationRegex.exec(text)) !== null) {
    const placeholder = `[[INT${interpolationIndex}]]`;
    protected = protected.replace(match[0], placeholder);
    placeholders.push({ placeholder, term: match[0] });
    interpolationIndex++;
  }

  return { protected, placeholders };
}

/**
 * Restore protected strings after translation
 */
function restoreStrings(text, placeholders) {
  let restored = text;
  for (const { placeholder, term } of placeholders) {
    restored = restored.split(placeholder).join(term);
  }
  return restored;
}

/**
 * Load or create hash file
 */
function loadHashes() {
  try {
    if (fs.existsSync(HASH_FILE)) {
      return JSON.parse(fs.readFileSync(HASH_FILE, 'utf8'));
    }
  } catch (e) {
    console.warn('Could not load hash file, starting fresh');
  }
  return {};
}

/**
 * Save hash file
 */
function saveHashes(hashes) {
  fs.writeFileSync(HASH_FILE, JSON.stringify(hashes, null, 2));
}

/**
 * Main translation function
 */
async function main() {
  const apiKey = process.env.AZURE_TRANSLATOR_KEY;
  const region = process.env.AZURE_TRANSLATOR_REGION || 'westus2';

  if (!apiKey) {
    console.error('Error: AZURE_TRANSLATOR_KEY environment variable is required');
    process.exit(1);
  }

  console.log('🌐 Bay Navigator i18n Translation\n');

  // Load source (English) file
  const enPath = path.join(I18N_DIR, `${SOURCE_LANG}.json`);
  if (!fs.existsSync(enPath)) {
    console.error(`Error: Source file not found: ${enPath}`);
    process.exit(1);
  }

  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const flatEn = flattenObject(enData);

  // Load existing hashes
  const hashes = loadHashes();

  // Calculate current hashes
  const currentHashes = {};
  for (const [key, value] of Object.entries(flatEn)) {
    currentHashes[key] = hashString(String(value));
  }

  // Process each target language
  for (const targetLang of TARGET_LANGUAGES) {
    console.log(`\n📝 Processing ${targetLang}...`);

    // Load existing translations if any
    const targetPath = path.join(I18N_DIR, `${targetLang}.json`);
    let existingTranslations = {};
    if (fs.existsSync(targetPath)) {
      try {
        existingTranslations = flattenObject(JSON.parse(fs.readFileSync(targetPath, 'utf8')));
      } catch (e) {
        console.warn(`  Warning: Could not parse existing ${targetLang}.json`);
      }
    }

    // Find strings that need translation
    const toTranslate = [];
    const langHashes = hashes[targetLang] || {};

    for (const [key, value] of Object.entries(flatEn)) {
      const currentHash = currentHashes[key];
      const previousHash = langHashes[key];

      // Translate if: new string, changed string, or missing translation
      if (currentHash !== previousHash || !existingTranslations[key]) {
        toTranslate.push({ key, value: String(value) });
      }
    }

    if (toTranslate.length === 0) {
      console.log(`  ✓ All strings up to date (${Object.keys(flatEn).length} strings)`);
      continue;
    }

    console.log(`  → Translating ${toTranslate.length} strings...`);

    // Prepare texts for translation (with protection)
    const protectedTexts = toTranslate.map((item) => protectStrings(item.value));
    const textsToTranslate = protectedTexts.map((p) => p.protected);

    // Batch translate (Azure allows up to 100 texts per request)
    const BATCH_SIZE = 100;
    const translations = [];

    for (let i = 0; i < textsToTranslate.length; i += BATCH_SIZE) {
      const batch = textsToTranslate.slice(i, i + BATCH_SIZE);
      try {
        const batchResults = await translateTexts(batch, targetLang, apiKey, region);
        translations.push(...batchResults);

        // Rate limiting: wait 100ms between batches
        if (i + BATCH_SIZE < textsToTranslate.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`  Error translating batch: ${error.message}`);
        process.exit(1);
      }
    }

    // Restore protected strings and update translations
    const newTranslations = { ...existingTranslations };
    const newHashes = { ...langHashes };

    for (let i = 0; i < toTranslate.length; i++) {
      const { key } = toTranslate[i];
      const { placeholders } = protectedTexts[i];
      const translated = restoreStrings(translations[i], placeholders);

      newTranslations[key] = translated;
      newHashes[key] = currentHashes[key];
    }

    // Remove keys that no longer exist in source
    for (const key of Object.keys(newTranslations)) {
      if (!(key in flatEn)) {
        delete newTranslations[key];
        delete newHashes[key];
      }
    }

    // Save translated file
    const outputData = unflattenObject(newTranslations);
    fs.writeFileSync(targetPath, JSON.stringify(outputData, null, 2) + '\n');
    console.log(`  ✓ Saved ${targetPath}`);

    // Update hashes
    hashes[targetLang] = newHashes;
  }

  // Save hash file
  saveHashes(hashes);
  console.log('\n✅ Translation complete!');

  // Summary
  console.log('\nLanguage files:');
  for (const lang of [SOURCE_LANG, ...TARGET_LANGUAGES]) {
    const langPath = path.join(I18N_DIR, `${lang}.json`);
    if (fs.existsSync(langPath)) {
      const stats = fs.statSync(langPath);
      console.log(`  ${lang}.json: ${(stats.size / 1024).toFixed(1)} KB`);
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
