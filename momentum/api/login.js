import { readJson, send } from './_lib/http.js';
import { checkPasscode, issueCookie, requireJson } from './_lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'method' });
  if (!requireJson(req, res)) return;
  if (!process.env.MOMENTUM_PASSCODE) return send(res, 500, { error: 'MOMENTUM_PASSCODE is not configured' });
  const { passcode } = await readJson(req);
  const r = checkPasscode(req, passcode);
  if (r.ok) return send(res, 200, { ok: true }, { 'Set-Cookie': issueCookie() });
  if (r.locked) return send(res, 429, { error: `Too many attempts. Try again in ${r.locked}s.` });
  return send(res, 401, { error: 'Wrong passcode' });
}
