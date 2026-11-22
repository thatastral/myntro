export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const f = (n, d = 1) => +(+n).toFixed(d);
export const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, n));
export const pct = n => `${Math.round(n * 100)}%`;
const SYM = { USD: '$', NGN: '₦', GBP: '£', EUR: '€' };
export function compact(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return `${f(n / 1e6, 1)}M`;
  if (a >= 1e4) return `${f(n / 1e3, 0)}K`;
  return Math.round(n).toLocaleString('en-US');
}
export const money = (n, cur) => `${n < 0 ? '-' : ''}${SYM[cur] || ''}${compact(Math.abs(n))}${SYM[cur] ? '' : cur ? ' ' + cur : ''}`;
export const moneyFull = (n, cur) => `${SYM[cur] || ''}${Math.round(n).toLocaleString('en-US')}${SYM[cur] ? '' : cur ? ' ' + cur : ''}`;
export const plural = (n, a, b = a + 's') => `${n} ${n === 1 ? a : b}`;
const fmtD = (k, o) => new Date(k + 'T00:00:00Z').toLocaleDateString('en-GB', { timeZone: 'UTC', ...o });
export const fmtDay = k => fmtD(k, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtShort = k => fmtD(k, { day: 'numeric', month: 'short' });
export const fmtWeekday = k => fmtD(k, { weekday: 'long' });
export function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), 2200);
}
export const ago = ms => { const s = Math.max(0, Math.round(ms / 1000)); return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : s < 3600 ? `${Math.round(s / 60)}m ago` : `${Math.round(s / 3600)}h ago`; };
