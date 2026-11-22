import { readJson, send } from './_lib/http.js';
import { requireAuth, requireJson } from './_lib/auth.js';
import { tickHabit } from './_lib/build.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!requireAuth(req, res) || !requireJson(req, res)) return;
  try {
    const { habit, date, value } = await readJson(req);
    send(res, 200, await tickHabit({ habit, date, value }));
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
}
