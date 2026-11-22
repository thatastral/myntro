import { send } from './_lib/http.js';
import { clearCookie } from './_lib/auth.js';

export default function handler(req, res) {
  send(res, 200, { ok: true }, { 'Set-Cookie': clearCookie() });
}
