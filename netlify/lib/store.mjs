// Preview and local builds write to their own Blobs store so a deploy preview
// can never change what the production site shows.
const STORE_NAME =
  process.env.CONTEXT === "production" ? "portfolio" : "portfolio-preview";

let getStoreFn;

/**
 * Netlify Blobs reads its auth context from the environment. A handle cached
 * for the life of a warm function container keeps the token it was created
 * with, so once that token expires every request in that container fails with
 * "Failed to decode token: Token expired". Creating the handle per call costs
 * almost nothing and always uses the current context.
 */
export async function getPortfolioStore() {
  if (!getStoreFn) {
    ({ getStore: getStoreFn } = await import("@netlify/blobs"));
  }
  return getStoreFn({ name: STORE_NAME, consistency: "strong" });
}

export function isBlobsAuthError(error) {
  const message = String(error?.message || error || "");
  return /failed to decode token|token (?:is )?expired|blobs.*(?:unauthori[sz]ed|forbidden|invalid)/i.test(
    message,
  );
}

/**
 * Wrap a store so a single expired-token failure is retried with a freshly
 * created handle. Every other error is passed through untouched.
 */
export function withStoreRetry(store, { getFresh = getPortfolioStore } = {}) {
  if (!store) return store;
  return new Proxy(store, {
    get(target, property, receiver) {
      const value = Reflect.get(target, property, receiver);
      if (typeof value !== "function") return value;
      return async function retrying(...args) {
        try {
          return await value.apply(target, args);
        } catch (error) {
          if (!isBlobsAuthError(error)) throw error;
          const fresh = await getFresh();
          const retry = Reflect.get(fresh, property);
          if (typeof retry !== "function") throw error;
          return await retry.apply(fresh, args);
        }
      };
    },
  });
}

export async function readJson(store, key) {
  const entry = await store.getWithMetadata(key, { type: "json" });
  if (!entry) return null;
  return { value: entry.data, etag: entry.etag ?? null };
}

export async function readText(store, key) {
  return store.get(key, { type: "text" });
}
