import { send } from './_lib/http.js';
import { requireAuth } from './_lib/auth.js';
import { getState } from './_lib/build.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;
  try {
    const url = new URL(req.url, 'http://x');
    const state = await getState({ force: url.searchParams.get('fresh') === '1' });
    // Polling is cheap: if nothing changed, answer with a few bytes.
    if (url.searchParams.get('v') === state.version) return send(res, 200, { unchanged: true, version: state.version });
    send(res, 200, state);
  } catch (e) {
    send(res, e.status || 500, { error: e.message });
  }
}
