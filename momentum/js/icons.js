const P = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  drop: '<path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5"/>',
  doc: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  headphones: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>',
  pen: '<path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  code: '<path d="M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-9-2 1-3 3-3 5-1-1-2-2-2-4-3 2-5 5-5 8 0 4 3 7 7 7z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  home: '<path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/>',
  fitness: '<path d="M6 8v8M3 10v4M18 8v8M21 10v4M6 12h12"/>',
  habits: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><path d="M14 17.5l2.2 2.2L21 15"/>',
  goals: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  money: '<rect x="2.5" y="6" width="19" height="12" rx="3"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
  career: '<rect x="3" y="7" width="18" height="13" rx="3"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18"/>',
  logout: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M15 8l4 4-4 4M19 12H9"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.5-3.5M4 4v4h4M4 13a8 8 0 0 0 14.5 3.5M20 20v-4h-4"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const DUO = new Set(['sun', 'drop', 'book', 'doc', 'eye', 'calendar', 'home', 'target', 'money', 'career', 'goals', 'lock', 'bolt', 'flame', 'alert']);
export const icon = (name, size = 20, extra = '') => {
  const p = P[name] || P.dot;
  const duo = DUO.has(name) ? `<g fill="currentColor" fill-opacity=".16" stroke="none">${p}</g>` : '';
  return `<svg class="ic ${extra}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${duo}${p}</svg>`;
};

// Status = fixed colours + icon + label, never colour alone.
export const STATUS = {
  done: { icon: 'check', cls: 'st-good', label: 'Done' },
  ahead: { icon: 'check', cls: 'st-good', label: 'Ahead' },
  'on-track': { icon: 'check', cls: 'st-good', label: 'On track' },
  behind: { icon: 'clock', cls: 'st-warn', label: 'Behind' },
  'at-risk': { icon: 'alert', cls: 'st-crit', label: 'At risk' },
  overdue: { icon: 'alert', cls: 'st-crit', label: 'Overdue' },
  open: { icon: 'dot', cls: 'st-neutral', label: 'Open' },
  'not-started': { icon: 'dot', cls: 'st-neutral', label: 'Not started' },
};
export const chip = (kind, text) => { const s = STATUS[kind] || STATUS.open; return `<span class="chip ${s.cls}">${icon(s.icon, 13)}${text ?? s.label}</span>`; };
