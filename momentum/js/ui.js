import { esc } from './util.js';
import { icon } from './icons.js';

export const card = (cls, title, body, action = '') =>
  `<section class="card ${cls}"><header class="ch"><h2>${title}</h2>${action}</header>${body}</section>`;
export const tile = (label, value, sub = '') =>
  `<div class="tile"><span class="sub">${esc(label)}</span><b>${value}</b>${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;
export const empty = t => `<div class="empty">${t}</div>`;
export const more = (href, text) => `<a class="more" href="${href}">${text}${icon('arrow', 14)}</a>`;
export const head = (title, sub = '', right = '') =>
  `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${right}</div>`;

// Habit chips. Writable ones tick back to Notion; the rest are read-only (lock icon).
export function habitChips(state, A, { keys = null, date = state.today } = {}) {
  const list = (state.habits?.list ?? []).filter(h => !keys || keys.includes(h.key));
  const row = state.habits?.days.find(d => d.date === date);
  if (!row) return `<div class="empty">No habit row for this day in Notion yet.</div>`;
  return `<div class="hchips">${list.map(h => {
    const done = !!row.done[h.key], s = A.hs[h.key];
    const tip = h.writable ? (done ? 'Tap to untick (syncs to Notion)' : 'Tap to tick (syncs to Notion)') : 'Read-only: tick this in Notion';
    return `<button class="hchip ${done ? 'on' : ''} ${h.writable ? 'rw' : 'ro'}" data-do="tick" data-habit="${esc(h.key)}" data-date="${date}" data-tip="${tip}" aria-pressed="${done}">
      <span class="hc-ic">${icon(done ? 'check' : h.icon, 18)}</span><span class="hc-l">${esc(h.label)}</span>
      <span class="hc-s">${s?.streak ? `${icon('flame', 12)}${s.streak}d` : h.writable ? '' : icon('lock', 12)}</span></button>`;
  }).join('')}</div>`;
}

// Compact icon strip (dashboard). Tap = tick (writable habits sync to Notion).
export function habitStrip(state, A, { date = state.today } = {}) {
  const list = state.habits?.list ?? [];
  const row = state.habits?.days.find(d => d.date === date);
  if (!row) return `<div class="empty">No habit row for today in Notion yet.</div>`;
  return `<div class="hstrip">${list.map(h => {
    const done = !!row.done[h.key];
    const tip = h.writable ? (done ? 'Tap to untick (syncs to Notion)' : 'Tap to tick (syncs to Notion)') : 'Read-only: tick this in Notion';
    return `<button class="hs ${done ? 'on' : ''} ${h.writable ? 'rw' : 'ro'}" data-do="tick" data-habit="${esc(h.key)}" data-date="${date}" data-tip="${tip}" aria-pressed="${done}">
      <span class="hi">${icon(done ? 'check' : h.icon, 20)}</span><span>${esc(h.label)}</span></button>`;
  }).join('')}</div>`;
}
