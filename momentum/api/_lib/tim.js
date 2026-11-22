// Tim (the finance app) is read through one small authenticated JSON endpoint.
//
// Expected contract:  GET {TIM_URL}/api/momentum   Authorization: Bearer {TIM_TOKEN}
// {
//   "currency": "NGN",
//   "month":   { "label": "November", "budget": 350000, "spent": 212400,
//                "categories": [{ "name": "Food", "budget": 90000, "spent": 61000 }] },
//   "savings": [{ "name": "Emergency fund", "saved": 1200, "target": 3000, "currency": "USD" }],
//   "recent":  [{ "date": "2026-11-21", "name": "Groceries", "amount": -12400, "category": "Food" }],
//   "updatedAt": "2026-11-22T08:00:00Z"
// }
let cache = { at: 0, data: null };
const TTL = 30_000;

export async function fetchTim() {
  const base = process.env.TIM_URL;
  if (!base) return null;
  if (cache.data && Date.now() - cache.at < TTL) return cache.data;
  try {
    const res = await fetch(base.replace(/\/$/, '') + '/api/momentum', {
      headers: process.env.TIM_TOKEN ? { Authorization: `Bearer ${process.env.TIM_TOKEN}` } : {},
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`Tim responded ${res.status}`);
    cache = { at: Date.now(), data: await res.json() };
  } catch (e) {
    return cache.data ? { ...cache.data, stale: true } : { error: String(e.message || e) };
  }
  return cache.data;
}
