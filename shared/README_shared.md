# Shared client utilities (web + mobile)

This folder provides small, framework-agnostic utilities you can reuse across web and future mobile apps.

## Modules

- `api-client.js`: Thin wrapper over the Functions API with ETag handling, query builder, and endpoint helpers (`getPrograms`, `getProgramById`, `getCategories`, `getAreas`, `getStats`). Accepts injected `fetchFn` and optional cache.
- `cache.js`: Simple cache with TTL and optional persistent storage (e.g., `localStorage` on web, AsyncStorage adapter on mobile). Exposes `get`, `set`, `remove`, `clear`, `stats`.
- `translation.js`: Helper for the `/api/translate` endpoint with deterministic request hashing so you can cache translations per text set and target language.

## Quick start (web)

```javascript
import { ApiClient } from '../shared/api-client';
import { createCache } from '../shared/cache';
import { translateTexts } from '../shared/translation';

const cache = createCache({
  storage: window.localStorage,
  maxEntries: 50,
  ttlMs: 1000 * 60 * 60 * 24 * 7,
});

const api = new ApiClient({ cache });

async function loadPrograms() {
  const { data } = await api.getPrograms({ category: 'Food' });
  console.log(data.programs);
}

async function translateSnippet(texts, targetLang) {
  const { translations, fromCache } = await translateTexts({ texts, targetLang, cache });
  console.log({ translations, fromCache });
}
```

## Quick start (mobile / React Native)

Use a synchronous storage adapter (e.g., `react-native-mmkv`) or fall back to in-memory cache:

```javascript
import { MMKV } from 'react-native-mmkv';
import { ApiClient } from '../shared/api-client';
import { createCache } from '../shared/cache';

const storage = new MMKV();
const storageAdapter = {
  getItem: (key) => storage.getString(key),
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};

const cache = createCache({
  storage: storageAdapter,
  maxEntries: 50,
  ttlMs: 1000 * 60 * 60 * 24 * 7,
});
const api = new ApiClient({ cache, fetchFn: fetch });

const { data } = await api.getPrograms({ area: 'San Francisco' });
```

If you only have async storage (e.g., `AsyncStorage`), instantiate `createCache()` without storage so the cache stays in memory.

## Notes

- ETag support: `ApiClient` sends `If-None-Match` when cached and returns cached bodies on `304` to cut bandwidth for mobile.
- Caching: `createCache` stores in memory and optional storage; it prunes to `maxEntries` and respects `ttlMs`.
- Translation caching: `translateTexts` hashes the request payload so repeated translations avoid network calls when a cache is provided.
- Extensibility: Add new endpoints by wrapping `request(path, options)`; keep responses small and cacheable for mobile.

Type definitions are available in `shared/index.d.ts` for quick consumption in TS projects.

## Future enhancements

- Publish this as a small npm package for web/mobile clients.
- Add typed definitions (TypeScript) and OpenAPI-generated clients.
- Add retries with backoff for flaky mobile networks.
- Add per-endpoint rate limiting or request coalescing in the cache layer.
