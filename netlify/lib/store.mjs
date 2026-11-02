const STORE_NAME = "portfolio";
let cachedStore;

/**
 * Netlify Blobs is imported lazily so tests can inject an in-memory store
 * without installing the runtime package.
 */
export async function getPortfolioStore() {
  if (!cachedStore) {
    const { getStore } = await import("@netlify/blobs");
    cachedStore = getStore({ name: STORE_NAME, consistency: "strong" });
  }
  return cachedStore;
}

export async function readJson(store, key) {
  const entry = await store.getWithMetadata(key, { type: "json" });
  if (!entry) return null;
  return { value: entry.data, etag: entry.etag ?? null };
}

export async function readText(store, key) {
  return store.get(key, { type: "text" });
}
