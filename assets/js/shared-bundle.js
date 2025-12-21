// Simple cache with optional persistent storage and TTL
// storage API expected: getItem(key) -> string|null, setItem(key, value), removeItem(key)

function createCache(options = {}) {
  const {
    maxEntries = 50,
    ttlMs = 1000 * 60 * 60 * 24 * 7,
    storage = null,
    namespace = 'shared-cache'
  } = options;

  const memory = new Map();
  const indexKey = `${namespace}:index`;

  function now() {
    return Date.now();
  }

  function readIndex() {
    if (!storage) return [];
    try {
      const raw = storage.getItem(indexKey);
      return raw ? JSON.parse(raw) : [];
    } catch (err) {
      return [];
    }
  }

  function writeIndex(entries) {
    if (!storage) return;
    try {
      storage.setItem(indexKey, JSON.stringify(entries));
    } catch (err) {
      // ignore write issues
    }
  }

  function prune(entries) {
    const sorted = entries.sort((a, b) => b.ts - a.ts);
    const toRemove = sorted.slice(maxEntries);
    toRemove.forEach(entry => {
      memory.delete(entry.key);
      if (storage) storage.removeItem(entry.key);
    });
    return sorted.slice(0, maxEntries);
  }

  function get(key) {
    const nowTs = now();
    if (memory.has(key)) {
      const { value, ts, ttl } = memory.get(key);
      const lifetime = ttl || ttlMs;
      if (nowTs - ts <= lifetime) return value;
      memory.delete(key);
    }

    if (storage) {
      try {
        const raw = storage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const lifetime = parsed.ttl || ttlMs;
          if (nowTs - parsed.ts <= lifetime) {
            memory.set(key, { value: parsed.value, ts: parsed.ts, ttl: parsed.ttl });
            return parsed.value;
          }
        }
        storage.removeItem(key);
      } catch (err) {
        // ignore read errors
      }
    }

    return undefined;
  }

  function set(key, value, entryTtlMs) {
    const entry = { value, ts: now(), ttl: entryTtlMs };
    memory.set(key, entry);

    if (storage) {
      try {
        storage.setItem(key, JSON.stringify(entry));
        const idx = readIndex();
        const existing = idx.findIndex(e => e.key === key);
        if (existing >= 0) {
          idx[existing].ts = entry.ts;
        } else {
          idx.push({ key, ts: entry.ts });
        }
        writeIndex(prune(idx));
      } catch (err) {
        // ignore persistence errors
      }
    }
  }

  function remove(key) {
    memory.delete(key);
    if (storage) {
      try {
        storage.removeItem(key);
        writeIndex(readIndex().filter(e => e.key !== key));
      } catch (err) {
        // ignore
      }
    }
  }

  function clear() {
    memory.clear();
    if (storage) {
      try {
        const idx = readIndex();
        idx.forEach(entry => storage.removeItem(entry.key));
        storage.removeItem(indexKey);
      } catch (err) {
        // ignore
      }
    }
  }

  function stats() {
    const idx = readIndex();
    return {
      memoryEntries: memory.size,
      storedEntries: idx.length,
      ttlMs,
      maxEntries
    };
  }

  return { get, set, remove, clear, stats };
}

module.exports = { createCache };
// Translation helper with pluggable fetch and cache
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
    cacheTtlMs = 1000 * 60 * 60 * 24 * 7
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
    body: JSON.stringify({ texts, targetLang, sourceLang })
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
