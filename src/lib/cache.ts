// Caché en memoria por instancia (server). Reduce round-trips a Supabase en
// datos que cambian poco (catálogos, proyecto, cliente, bloques de horas).
// Se limpia explícitamente al escribir (clearReadCache) y tiene TTL de respaldo.

type Entry = { t: number; v: unknown };
const store = new Map<string, Entry>();

export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.t < ttlMs) return hit.v as T;
  const v = await fn();
  store.set(key, { t: Date.now(), v });
  return v;
}

export function clearReadCache() {
  store.clear();
}
