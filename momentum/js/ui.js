import { esc } from './util.js';
import { icon } from './icons.js';
import { areaN } from './areas.js';

export const sets = { money: new Set(), cats: new Set(), careerAll: false };

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
    return `<button class="hchip a${areaN(h.group)} ${done ? 'on' : ''} ${h.writable ? 'rw' : 'ro'}" data-do="tick" data-habit="${esc(h.key)}" data-date="${date}" data-tip="${tip}" aria-pressed="${done}">
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
    return `<button class="hs a${areaN(h.group)} ${done ? 'on' : ''} ${h.writable ? 'rw' : 'ro'}" data-do="tick" data-habit="${esc(h.key)}" data-date="${date}" data-tip="${tip}" aria-pressed="${done}">
      <span class="hi">${icon(done ? 'check' : h.icon, 20)}</span><span>${esc(h.label)}</span></button>`;
  }).join('')}</div>`;
}

const flameArt = () => `<svg viewBox="0 0 120 140" aria-hidden="true"><defs><linearGradient id="fl1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFE08A"/><stop offset="1" stop-color="#FF8A4C"/></linearGradient></defs>
  <path d="M60 6c6 26 34 38 34 76 0 24-16 44-34 44S26 106 26 82c0-14 6-24 14-34 2 14 8 20 14 22C50 44 52 24 60 6z" fill="url(#fl1)"/>
  <path d="M60 70c4 12 18 18 18 34 0 11-8 20-18 20s-18-9-18-20c0-9 5-14 9-20 1 7 4 10 7 11-1-12 0-20 2-25z" fill="#fff" fill-opacity=".55"/>
  <circle cx="102" cy="26" r="4" fill="#fff" fill-opacity=".7"/><circle cx="14" cy="58" r="3" fill="#fff" fill-opacity=".6"/><circle cx="108" cy="70" r="2.5" fill="#fff" fill-opacity=".6"/></svg>`;

// Liven-style streak card: big number, cheer line, weekday dots and a flame.
export function streakBanner({ n, unit = 'day', title, sub, days, area = 2 }) {
  return `<section class="card streak-banner a${area}"><div class="sb-text"><div class="sb-head"><div class="sb-n">${n}<small>${unit}${n === 1 ? '' : 's'}</small></div>
    <div class="sb-title">${esc(title)}</div><div class="sb-sub">${esc(sub)}</div></div>
    <div class="sdots">${days.map(d => `<div class="sd ${d.done ? 'on' : ''} ${d.today ? 'now' : ''}" data-tip="${esc(d.name)}${d.done ? ': done' : d.future ? '' : ': not yet'}"><span>${esc(d.label)}</span><i>${d.done ? icon('bolt', 17) : ''}</i></div>`).join('')}</div></div>
    <div class="sb-art">${flameArt()}</div></section>`;
}
