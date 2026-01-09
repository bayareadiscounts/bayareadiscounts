// Translation helper with pluggable fetch and cache
// Note: Translation API is currently disabled. Configure your own endpoint if needed.
const DEFAULT_TRANSLATE_ENDPOINT = '';

function hashTexts(texts) {
  let hash = 0;
  for (let i = 0; i < texts.length; i++) {
    const t = texts[i];
    for (let j = 0; j < t.length; j++) {
      hash = (hash << 5) - hash + t.charCodeAt(j);
      hash |= 0;
    }
    hash ^= 31 * (i + 1);
  }
  return Math.abs(hash).toString(36);
}

async function translateTexts(options) {
  const {
    texts,
    targetLang,
    sourceLang = 'en',
    endpoint = DEFAULT_TRANSLATE_ENDPOINT,
    fetchFn = typeof fetch !== 'undefined' ? fetch : null,
    cache = null,
    cacheTtlMs = 1000 * 60 * 60 * 24 * 7,
  } = options || {};

  if (!Array.isArray(texts) || texts.length === 0) throw new Error('texts array is required');
  if (!targetLang) throw new Error('targetLang is required');
  if (!fetchFn) throw new Error('fetch is not available; provide fetchFn');

  const cacheKey = `translation:${targetLang}:${hashTexts(texts)}`;

  if (cache) {
    const cached = cache.get(cacheKey);
    if (cached) return { translations: cached, fromCache: true };
  }

  const res = await fetchFn(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ texts, targetLang, sourceLang }),
  });

  if (!res.ok) {
    let message = `Translation failed with status ${res.status}`;
    try {
      // Clone response before reading to allow fallback
      const resClone = res.clone();
      const errJson = await resClone.json();
      message = errJson.error || errJson.message || message;
    } catch (err) {
      try {
        const text = await res.text();
        if (text) message = text;
      } catch (e) {
        // Body already consumed, use default message
      }
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  const translations = data.translations || [];

  if (cache) {
    cache.set(cacheKey, translations, cacheTtlMs);
  }

  return { translations, fromCache: false };
}

module.exports = { translateTexts, DEFAULT_TRANSLATE_ENDPOINT };
