/**
 * "Last good copy" for the outside sources of Nexus Home (weather, news feeds, exchange rate).
 *
 * The cached loaders THROW when their source fails, so a failure is never stored in the cache.
 * This wrapper catches the failure and answers with the last successful result this server
 * process saw (marked not-ok, which the page shows as a "stale" pill), or null if there has
 * never been one. A page section then hides or shows its empty state: never a 500.
 */
const store = new Map<string, unknown>();

export async function withLastGood<T>(key: string, load: () => Promise<T>): Promise<{ data: T | null; ok: boolean }> {
  try {
    const data = await load();
    store.set(key, data);
    return { data, ok: true };
  } catch (err) {
    console.warn(`[home] ${key} failed; serving the last good copy:`, err instanceof Error ? err.message : err);
    return { data: (store.get(key) as T | undefined) ?? null, ok: false };
  }
}
