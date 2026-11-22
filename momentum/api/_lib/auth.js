import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { send, clientIp } from './http.js';

const COOKIE = 'mm_session';
const MAX_AGE = 60 * 60 * 24 * 90; // 90 days: log in once per device

const secret = () => {
  const s = process.env.SESSION_SECRET;
  if (s) return s;
  // Fallback so a missing SESSION_SECRET never means "no signing": derive from the passcode.
  return createHash('sha256').update('momentum:' + (process.env.MOMENTUM_PASSCODE || '')).digest('hex');
};
const sign = payload => createHmac('sha256', secret()).update(payload).digest('base64url');

function safeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

export function issueCookie() {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = String(exp);
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : '';
  return `${COOKIE}=${payload}.${sign(payload)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}${secure}`;
}
export const clearCookie = () => `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;

export function isAuthed(req) {
  if (!process.env.MOMENTUM_PASSCODE) return false; // never open by accident
  const raw = (req.headers.cookie || '').split(/;\s*/).find(c => c.startsWith(COOKIE + '='));
  if (!raw) return false;
  const [exp, sig] = raw.slice(COOKIE.length + 1).split('.');
  if (!exp || !sig || +exp < Date.now() / 1000) return false;
  try { return safeEqual(sig, sign(exp)); } catch { return false; }
}

export function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  send(res, 401, { error: 'unauthorized' });
  return false;
}

// Browsers can't send cross-site JSON POSTs with our cookie without a preflight,
// but we also insist on the JSON content type as a second guard.
export function requireJson(req, res) {
  if ((req.headers['content-type'] || '').includes('application/json')) return true;
  send(res, 415, { error: 'expected application/json' });
  return false;
}

// Passcode brute-force brake (per warm instance; enough for a single-user app).
const fails = new Map();
export function checkPasscode(req, passcode) {
  const ip = clientIp(req), now = Date.now();
  const f = fails.get(ip) || { n: 0, until: 0 };
  if (f.until > now) return { ok: false, locked: Math.ceil((f.until - now) / 1000) };
  const expected = process.env.MOMENTUM_PASSCODE;
  if (expected && safeEqual(passcode || '', expected)) { fails.delete(ip); return { ok: true }; }
  f.n += 1;
  if (f.n >= 5) { f.until = now + 60_000; f.n = 0; }
  fails.set(ip, f);
  return { ok: false };
}
