'use strict';
/* Momentum — local-first fitness tracker. No backend, no dependencies. */

// ---------- helpers ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const pad = n => String(n).padStart(2, '0');
const dKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const tKey = d => `${dKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const today = () => dKey(new Date());
const parseKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return dKey(d); };
const weekStart = k => { const d = parseKey(k || today()); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dKey(d); };
const f = (n, d = 1) => +(+n).toFixed(d);
const num = v => (v === '' || v == null || isNaN(+v) ? null : +v);
const fmtDay = k => parseKey(k).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const fmtPace = m => { let mm = Math.floor(m), ss = Math.round((m - mm) * 60); if (ss === 60) { mm++; ss = 0; } return `${mm}:${pad(ss)}`; };
const fmtTime = s => s.length > 10 ? s.slice(11, 16) : '';

const TYPES = { cycling: 'Cycling', running: 'Running', pushups: 'Push-ups', walking: 'Walking', custom: 'Custom' };
const MET = { cycling: 6.8, running: 9.8, walking: 3.5 }; // rough averages; calories are always labelled "est."
const UNITS = { cycling: ['min', 'km', 'sessions'], running: ['min', 'km', 'sessions'], pushups: ['reps', 'sessions'], walking: ['min', 'km', 'sessions'], any: ['days'] };
const UNIT_LABEL = { min: 'min', km: 'km', reps: 'reps', sessions: 'sessions', days: 'days' };

// ---------- storage (IndexedDB) ----------
let db;
const STORES = ['profile', 'weights', 'activities', 'goals', 'water'];
const ALL_STORES = [...STORES, 'outbox'];
const S = { profile: null, weights: [], activities: [], goals: [], water: [] };

const openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open('momentum', 3);
  r.onupgradeneeded = () => ALL_STORES.forEach(s => { if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: s === 'outbox' ? 'key' : 'id' }); });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const tx = (s, mode, fn) => new Promise((res, rej) => {
  const t = db.transaction(s, mode);
  const q = fn(t.objectStore(s));
  t.oncomplete = () => res(q && q.result);
  t.onerror = () => rej(t.error);
  t.onabort = () => rej(t.error);
});
const dbAll = s => tx(s, 'readonly', o => o.getAll());

// Every local write is stamped and queued in the outbox so it can be synced to the server database.
const enqueue = (store, id, data, updatedAt, deleted) => tx('outbox', 'readwrite', o => o.put({ key: `${store}:${id}`, store, id, data, updatedAt, deleted }));
async function save(store, rec, opt = {}) {
  if (!opt.remote) rec.updatedAt = Date.now();
  await tx(store, 'readwrite', o => o.put(rec));
  if (store === 'profile') S.profile = rec;
  else {
    const i = S[store].findIndex(x => x.id === rec.id);
    if (i >= 0) S[store][i] = rec; else S[store].push(rec);
  }
  if (!opt.remote) { await enqueue(store, rec.id, rec, rec.updatedAt, false); queueSync(); }
}
async function remove(store, id, opt = {}) {
  if (store === 'profile') return;
  await tx(store, 'readwrite', o => o.delete(id));
  S[store] = S[store].filter(x => x.id !== id);
  if (!opt.remote) { await enqueue(store, id, null, Date.now(), true); queueSync(); }
}
async function load() {
  const [p, w, a, g, wa] = await Promise.all(STORES.map(dbAll));
  S.profile = p[0] || null; S.weights = w; S.activities = a; S.goals = g; S.water = wa;
}

// ---------- domain ----------
const sortedWeights = () => [...S.weights].sort((a, b) => a.date.localeCompare(b.date) || (a.ts || 0) - (b.ts || 0));
const curWeight = () => { const w = sortedWeights(); return w.length ? w[w.length - 1].weight : S.profile?.startingWeight ?? null; };

// Progress is measured along the start→target line, so it is correct for loss, gain and maintain goals.
function progress() {
  const p = S.profile; if (!p) return null;
  const cur = curWeight(), span = p.targetWeight - p.startingWeight, moved = cur - p.startingWeight;
  const pct = span === 0 ? (moved === 0 ? 100 : 0) : Math.max(0, Math.min(100, (moved / span) * 100));
  return { cur, span, moved, pct, mode: span < 0 ? 'lose' : span > 0 ? 'gain' : 'maintain' };
}

function metric(a, unit) {
  if (unit === 'min') return a.duration || 0;
  if (unit === 'km') return a.distance || 0;
  if (unit === 'reps') return (a.repetitions || 0) * (a.sets || 1);
  return 1; // sessions
}
function goalProg(g) {
  const start = g.frequency === 'daily' ? today() : weekStart();
  const end = g.frequency === 'daily' ? start : addDays(start, 6);
  const acts = S.activities.filter(a => { const k = a.date.slice(0, 10); return k >= start && k <= end && (g.activityType === 'any' || a.activityType === g.activityType); });
  const v = g.targetUnit === 'days' ? new Set(acts.map(a => a.date.slice(0, 10))).size : acts.reduce((s, a) => s + metric(a, g.targetUnit), 0);
  return { v, pct: Math.min(100, (v / g.targetValue) * 100) };
}
const goalName = g => {
  const what = g.activityType === 'any' ? 'Exercise' : TYPES[g.activityType];
  return g.targetUnit === 'days' ? `${what} ${f(g.targetValue)} days / week` : `${what}: ${f(g.targetValue)} ${UNIT_LABEL[g.targetUnit]} ${g.frequency}`;
};
const estCalories = (type, duration, weightKg) => MET[type] && duration ? Math.round(MET[type] * (weightKg || 70) * (duration / 60)) : null;

function actSummary(a) {
  const p = [];
  if (a.duration) p.push(`${f(a.duration)} min`);
  if (a.distance) p.push(`${f(a.distance, 2)} km`);
  if (a.activityType === 'running' && a.duration && a.distance >= 0.1) p.push(`${fmtPace(a.duration / a.distance)} /km`);
  if (a.activityType === 'cycling' && a.duration && a.distance) p.push(`${f(a.distance / (a.duration / 60))} km/h`);
  if (a.repetitions) p.push(a.setReps && a.setReps.length > 1 ? `${a.repetitions} reps (${a.setReps.join(' · ')})` : `${a.repetitions} reps${a.sets > 1 ? ` × ${a.sets} sets` : ''}`);
  if (a.rpm) p.push(`${f(a.rpm, 0)} rpm`);
  return p.join(' · ');
}
const actTitle = a => a.activityType === 'custom' ? (a.customName || 'Custom') : TYPES[a.activityType];
function totals(acts) {
  return {
    sessions: acts.length,
    days: new Set(acts.map(a => a.date.slice(0, 10))).size,
    min: acts.reduce((s, a) => s + (a.duration || 0), 0),
    km: acts.reduce((s, a) => s + (a.distance || 0), 0),
    reps: acts.reduce((s, a) => s + metric(a, 'reps') * (a.repetitions ? 1 : 0), 0),
  };
}
const totalsHTML = t => `<div class="grid"><div><b>${t.sessions}</b><span class="sub">sessions</span></div><div><b>${t.days}</b><span class="sub">active days</span></div><div><b>${f(t.min, 0)}</b><span class="sub">minutes</span></div><div><b>${f(t.km)}</b><span class="sub">km</span></div><div><b>${t.reps}</b><span class="sub">reps</span></div></div>`;

// ---------- UI primitives ----------
let toastT;
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800);
}
const ring = (pct, size, inner, sw = 12) => {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, m = size / 2;
  return `<div class="ring" style="width:${size}px;height:${size}px"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="rt" cx="${m}" cy="${m}" r="${r}" stroke-width="${sw}"/><circle class="rp" cx="${m}" cy="${m}" r="${r}" stroke-width="${sw}" style="--c:${c}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(100, pct) / 100)}" transform="rotate(-90 ${m} ${m})"/></svg><div class="ri">${inner}</div></div>`;
};
function weekStrip() {
  const ws = weekStart(today()), on = new Set(S.activities.map(a => a.date.slice(0, 10)));
  return `<div class="week">${'MTWTFSS'.split('').map((l, i) => { const k = addDays(ws, i); return `<div class="${on.has(k) ? 'on' : ''} ${k === today() ? 'now' : ''}"><i>${on.has(k) ? '✓' : ''}</i><span>${l}</span></div>`; }).join('')}</div>`;
}
const bar = pct => `<div class="bar ${pct >= 100 ? 'done' : ''}"><i style="width:${pct}%"></i></div>`;
const actRow = a => `<div class="item"><div><i class="adot" style="--h:${HUE[a.activityType] || HUE.custom}"></i><b>${esc(actTitle(a))}</b> <span class="sub">${esc(fmtTime(a.date))}</span><div class="sub">${esc(actSummary(a))}${a.estimatedCalories ? ` · <span class="est">~${a.estimatedCalories} kcal (est.)</span>` : ''}</div>${a.notes ? `<div class="sub">“${esc(a.notes)}”</div>` : ''}</div><a class="btn" href="#log/${a.id}">Edit</a></div>`;

const emptyArt = (kind, text) => `<div class="empty art"><div class="artbox">${ART[kind] || ''}</div><div>${text}</div></div>`;
// ---------- water ----------
const GLASS = 250;
const waterGoal = () => S.water.find(x => x.id === 'goal')?.ml || 1500;
const waterSum = k => S.water.filter(x => x.type === 'entry' && x.date === k).reduce((s, x) => s + x.ml, 0);
const fmtVol = ml => ml >= 1000 ? `${+(ml / 1000).toFixed(2)}<small> L</small>` : `${ml}<small> ml</small>`;
const fmtL = ml => `${+(ml / 1000).toFixed(2)} L`;
function waterInner(just = -1) {
  const goal = waterGoal(), ml = waterSum(today()), n = Math.max(1, Math.ceil(goal / GLASS));
  const glasses = range(0, n - 1).map(i => `<div class="glass ${i === just ? 'just' : ''}"><i style="--f:${Math.max(0, Math.min(1, (ml - i * GLASS) / GLASS))}"></i></div>`).join('');
  const has = S.water.some(x => x.type === 'entry' && x.date === today());
  return `<div class="row"><div><div class="eyebrow">${ic('drop:duotone', 'wi')} Water</div><div class="big wnum">${fmtVol(ml)}</div><div class="sub">${ml >= goal ? 'Goal reached ✓' : `${goal - ml} ml to go`}</div></div>
    ${ring((ml / goal) * 100, 68, `<button class="plus" data-act="water-add" data-ml="${GLASS}" aria-label="Add a glass of water">${ic('plus:bold')}</button>`, 7)}</div>
    <div class="glasses">${glasses}</div>
    <div class="row wfoot"><button class="link" data-act="water-goal" style="color:var(--sub)">Goal ${fmtL(goal)} ›</button>
    <span class="wq"><button data-act="water-add" data-ml="150">+150</button><button data-act="water-add" data-ml="500">+500</button>${has ? `<button data-act="water-undo" aria-label="Undo last">${ic('arrow-counter-clockwise')}</button>` : ''}</span></div>`;
}
function refreshWater(just = -1) { const c = $('#waterCard'); if (c) c.innerHTML = waterInner(just); }
async function addWater(ml) {
  const goal = waterGoal(), before = waterSum(today());
  await save('water', { id: uid(), type: 'entry', date: today(), ml, ts: Date.now() });
  const now = before + ml;
  refreshWater(Math.min(Math.ceil(goal / GLASS) - 1, Math.floor((now - 1) / GLASS)));
  if (before < goal && now >= goal) { toast('Water goal reached 💧'); haptic([14, 60, 14, 60, 28]); } else haptic(10);
}
async function undoWater() {
  const last = S.water.filter(x => x.type === 'entry' && x.date === today()).sort((a, b) => b.ts - a.ts)[0];
  if (!last) return;
  await remove('water', last.id); refreshWater(); toast(`Removed ${last.ml} ml`);
}
const WG = { ml: 1500 };
function openWaterGoal() {
  WG.ml = waterGoal(); WSTATE = WG;
  $('#dlg').innerHTML = `${sheetHead('Water goal', 'How much each day?')}
    <div class="wheels">${wheel('ml', 500, 5000, WG.ml, 'ml', 100)}</div>
    <button class="cta" id="wgSave" data-act="wg-save">Set goal · ${fmtL(WG.ml)}</button>`;
  $('#dlg').querySelectorAll('.wheel').forEach(w => { w.scrollTop = ((+w.dataset.val - +w.dataset.lo) / +w.dataset.step) * 44; });
  if (!$('#dlg').open) $('#dlg').showModal();
}
async function saveWaterGoal() { await save('water', { id: 'goal', type: 'goal', ml: WG.ml }); closeSheet(); toast(`Goal set to ${fmtL(WG.ml)}`); haptic([10, 40, 16]); render(); }

// ---------- dashboard helpers ----------
const actDay = a => a.date.slice(0, 10);
function streak() {
  const days = new Set(S.activities.map(actDay));
  let k = today(); if (!days.has(k)) k = addDays(k, -1);
  let n = 0; while (days.has(k)) { n++; k = addDays(k, -1); }
  return n;
}
const dayMins = k => S.activities.filter(a => actDay(a) === k).reduce((s, a) => s + (a.duration || 0), 0);
function weekBars() {
  const ws = weekStart(), L = 'MTWTFSS';
  const mins = L.split('').map((_, i) => dayMins(addDays(ws, i)));
  const max = Math.max(30, ...mins);
  const cur = mins.reduce((a, b) => a + b, 0);
  const prevStart = addDays(ws, -7);
  const prev = [0, 1, 2, 3, 4, 5, 6].reduce((s, i) => s + dayMins(addDays(prevStart, i)), 0);
  const diff = cur - prev;
  const cmp = prev === 0 && cur === 0 ? '' : prev === 0 ? 'First active week' : `${diff >= 0 ? '+' : '−'}${f(Math.abs(diff), 0)} min vs last week`;
  return `<div class="bars" role="img" aria-label="Minutes per day this week">${mins.map((m, i) => { const k = addDays(ws, i); return `<div class="${k === today() ? 'now' : ''}"><em>${m ? f(m, 0) : ''}</em><b><i style="height:${m ? Math.max(6, (m / max) * 100) : 0}%"></i></b><span>${L[i]}</span></div>`; }).join('')}</div>
    <div class="sub" style="margin-top:8px">${f(cur, 0)} min this week${cmp ? ` · ${cmp}` : ''}</div>`;
}
function bests() {
  const A = S.activities, out = [];
  const maxBy = (arr, fn) => arr.reduce((x, y) => (fn(y) > fn(x) ? y : x));
  const rides = A.filter(a => a.activityType === 'cycling' && a.distance);
  if (rides.length) { const b = maxBy(rides, a => a.distance); out.push(['Longest ride', `${f(b.distance)} km`, actDay(b)]); }
  const runs = A.filter(a => a.activityType === 'running' && a.distance >= 1 && a.duration);
  if (runs.length) {
    const p = runs.reduce((x, y) => (y.duration / y.distance < x.duration / x.distance ? y : x));
    out.push(['Fastest run pace', `${fmtPace(p.duration / p.distance)} /km`, actDay(p)]);
    const l = maxBy(runs, a => a.distance); out.push(['Longest run', `${f(l.distance)} km`, actDay(l)]);
  }
  const pu = A.filter(a => a.activityType === 'pushups' && a.repetitions);
  if (pu.length) {
    const tot = a => a.repetitions * (a.sets || 1), b = maxBy(pu, tot);
    out.push(['Most push-ups in a session', `${tot(b)}`, actDay(b)]);
    const sets = pu.filter(a => a.setReps && a.setReps.length > 1);
    if (sets.length) { let best = 0, day = ''; sets.forEach(a => a.setReps.forEach(r => { if (r > best) { best = r; day = actDay(a); } })); out.push(['Best single set', `${best}`, day]); }
  }
  return out;
}
const HUE = { cycling: '#4DA3FF', running: '#FF5C7A', pushups: '#FFB020', walking: '#3DDBA7', custom: '#8A8A8A' };
const TILES = [
  ['cycling', 'Cycle', 'person-simple-bike:duotone'],
  ['running', 'Run', 'person-simple-run:duotone'],
  ['pushups', 'Push-ups', 'barbell:duotone'],
  ['walking', 'Walk', 'person-simple-walk:duotone'],
];


// ---------- views ----------
function vDash() {
  const pr = progress(), t = today(), ws = weekStart();
  const act = S.goals.filter(g => g.active);
  const daily = act.filter(g => g.frequency === 'daily'), weekly = act.filter(g => g.frequency === 'weekly');
  const hr = new Date().getHours(), greet = hr < 12 ? 'Good morning' : hr < 18 ? 'Good afternoon' : 'Good evening';
  const mToday = dayMins(t), st = streak();
  let h = '';
  if (WS) {
    h += `<a class="card live" href="#workout/${WS.type}"><span class="dotlive"></span><div><b>${esc(TYPES[WS.type])} in progress</b><div class="sub" id="liveT">${fmtClock(wsElapsed(WS))}</div></div><span class="btn primary">Resume</span></a>`;
  }
  // hero: today's progress
  const dPcts = daily.map(g => goalProg(g).pct);
  const pct = daily.length ? dPcts.reduce((a, b) => a + b, 0) / daily.length : Math.min(100, (mToday / 30) * 100);
  const sub = daily.length ? `${dPcts.filter(p => p >= 100).length} of ${daily.length} daily goals` : 'of 30 min';
  h += `<div class="card hero"><div class="sub">${greet} · ${esc(parseKey(t).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
    ${ring(pct, 168, `<div class="big">${f(mToday, 0)}</div><div class="sub">min today</div>`, 14)}
    <div class="sub" style="margin-top:-2px">${sub}</div>
    <div class="pill" style="margin:12px 0 0">${ic('flame:fill')}${st ? `${st}-day streak` : 'Start your streak today'}</div></div>`;
  // quick start
  h += `<div class="card"><h2>Start a workout</h2><div class="tiles">${TILES.map(([k, l, icn]) => `<a class="tile" href="#workout/${k}" style="--h:${HUE[k]}">${ic(icn)}<span>${l}</span></a>`).join('')}</div>
    <div style="text-align:center;margin-top:10px"><a class="link" href="#log" style="color:var(--sub);font-size:13px">or log one manually</a></div></div>`;
  h += `<div class="card" id="waterCard">${waterInner()}</div>`;
  // goals
  const gl = g => { const p = goalProg(g); return `<div class="goal row" style="justify-content:flex-start;gap:12px">${ring(p.pct, 46, `<span class="mini">${f(p.pct, 0)}</span>`, 6)}<div><b>${esc(goalName(g))}</b><div class="sub">${f(p.v)} of ${f(g.targetValue)} ${esc(UNIT_LABEL[g.targetUnit])}</div></div></div>`; };
  h += `<div class="card"><h2>Goals <button class="link" data-act="goal" data-id="">+ Add</button></h2>`;
  if (!act.length) h += emptyArt('team', 'No active goals yet. Add one, e.g. 30 min cycling daily.');
  if (daily.length) h += `<div class="sub" style="margin-bottom:6px">Today</div>${daily.map(gl).join('')}`;
  if (weekly.length) h += `<div class="sub" style="margin:8px 0 6px">This week</div>${weekly.map(gl).join('')}`;
  if (S.goals.length) h += `<div style="margin-top:10px">${S.goals.map(g => `<button class="link" data-act="goal" data-id="${g.id}">${g.active ? '' : '(paused) '}Edit: ${esc(goalName(g))}</button>`).join('<br>')}</div>`;
  h += `</div>`;
  const todays = S.activities.filter(a => a.date.startsWith(t)).sort((a, b) => b.date.localeCompare(a.date));
  h += `<div class="card"><h2>Today <a class="btn primary" href="#log">+ Log</a></h2>${todays.length ? todays.map(actRow).join('') : emptyArt('workout', 'Nothing logged yet today. Your move.')}</div>`;
  const wk = S.activities.filter(a => a.date.slice(0, 10) >= ws);
  h += `<div class="card"><h2>This week</h2>${weekBars()}${totalsHTML(totals(wk))}</div>`;
  const bs = bests();
  if (bs.length) h += `<div class="card"><h2>Personal bests ${ic('trophy:duotone', 'h2i')}</h2>${bs.map(([l, v, d]) => `<div class="item"><div><b>${esc(l)}</b><div class="sub">${esc(fmtDay(d))}</div></div><b class="bigv">${esc(v)}</b></div>`).join('')}</div>`;
  // weight
  if (!pr) {
    h += `<div class="card"><h2>Body weight</h2><div class="artbox" style="max-width:220px;margin:0 auto 6px">${ART.stats}</div><div class="sub">Set your starting and target weight to track progress.</div><p><a class="btn primary full" style="text-align:center" href="#weight">Set weights</a></p></div>`;
  } else {
    const delta = pr.cur - S.profile.startingWeight;
    h += `<a class="card row wcard" href="#weight" style="text-decoration:none;color:inherit">${ring(pr.pct, 72, `<span class="mini">${f(pr.pct, 0)}%</span>`, 8)}
      <div style="flex:1"><div class="sub">Body weight</div><div class="big" style="font-size:30px">${f(pr.cur)} <span class="sub">kg</span></div><div class="sub">${delta === 0 ? 'No change' : `${delta > 0 ? '+' : '−'}${f(Math.abs(delta))} kg`} since start · ${f(Math.abs(S.profile.targetWeight - pr.cur))} kg to go</div></div></a>`;
  }
  return h;
}

// --- log / edit activity
function logFields(a) {
  const v = k => esc(a[k] ?? '');
  const t = (types, inner) => `<div data-types="${types}">${inner}</div>`;
  return `
  ${t('custom', `<label>Name<input name="customName" value="${v('customName')}" maxlength="40" placeholder="e.g. Squats"></label>`)}
  <div class="two">
  ${t('cycling running walking custom', `<label>Duration (min)<input name="duration" type="number" inputmode="decimal" min="0" step="any" value="${v('duration')}"></label>`)}
  ${t('cycling running walking', `<label>Distance (km)<input name="distance" type="number" inputmode="decimal" min="0" step="any" value="${v('distance')}"></label>`)}
  ${t('cycling', `<label>Avg RPM<input name="rpm" type="number" inputmode="decimal" min="0" step="any" value="${v('rpm')}"></label>`)}
  ${t('pushups custom', `<label>Reps${'' /* per set */}<input name="repetitions" type="number" inputmode="numeric" min="0" step="1" value="${v('repetitions')}"></label>`)}
  ${t('pushups custom', `<label>Sets<input name="sets" type="number" inputmode="numeric" min="1" step="1" value="${a.sets ?? ''}" placeholder="1"></label>`)}
  </div>`;
}
function vLog(id) {
  const a = id ? S.activities.find(x => x.id === id) : null;
  if (id && !a) return `<div class="card empty">Entry not found. <a href="#history">Back</a></div>`;
  let last = 'cycling'; try { last = localStorage.getItem('m_lastType') || 'cycling'; } catch {}
  const rec = a || { activityType: last, date: tKey(new Date()) };
  return `<form id="logForm" class="card" data-id="${a?.id || ''}" data-type="${rec.activityType}">
    <h2>${a ? 'Edit activity' : 'Log activity'}</h2>
    <div class="chips" role="group">${Object.entries(TYPES).map(([k, l]) => `<button type="button" data-act="type" data-type="${k}" class="${k === rec.activityType ? 'on' : ''}">${l}</button>`).join('')}</div>
    ${logFields(rec)}
    <label>Date &amp; time<input name="date" type="datetime-local" required value="${esc(rec.date)}"></label>
    <label>Notes (optional)<input name="notes" maxlength="200" value="${esc(rec.notes || '')}"></label>
    <div class="sub" style="margin-bottom:10px">Calories for cycling and walking are estimates, not measurements.</div>
    <button class="primary full" type="submit">${a ? 'Save changes' : 'Save'}</button>
    ${a ? `<p><button class="danger full" type="button" data-act="del-act" data-id="${a.id}">Delete entry</button></p>` : ''}
  </form>`;
}
function syncLogForm() {
  const form = $('#logForm'); if (!form) return;
  const type = form.dataset.type;
  form.querySelectorAll('[data-types]').forEach(el => { el.hidden = !el.dataset.types.split(' ').includes(type); });
  form.querySelectorAll('[data-act=type]').forEach(b => b.classList.toggle('on', b.dataset.type === type));
}
async function submitLog(form) {
  const fd = new FormData(form), type = form.dataset.type, id = form.dataset.id;
  const rec = {
    id: id || uid(), activityType: type, date: fd.get('date'),
    duration: null, distance: null, repetitions: null, sets: null, rpm: null, estimatedCalories: null,
    notes: (fd.get('notes') || '').trim(),
  };
  if (type === 'custom') rec.customName = (fd.get('customName') || '').trim();
  if (['cycling', 'running', 'walking', 'custom'].includes(type)) rec.duration = num(fd.get('duration'));
  if (['cycling', 'running', 'walking'].includes(type)) rec.distance = num(fd.get('distance'));
  if (type === 'cycling') rec.rpm = num(fd.get('rpm'));
  if (['pushups', 'custom'].includes(type)) { rec.repetitions = num(fd.get('repetitions')); rec.sets = rec.repetitions ? (num(fd.get('sets')) || 1) : null; }
  const old = id && S.activities.find(x => x.id === id); // keep what a live workout recorded if the reps weren't changed
  if (old && type === 'pushups') { rec.duration = old.duration ?? null; if (old.repetitions === rec.repetitions && (old.sets || 1) === (rec.sets || 1) && old.setReps) rec.setReps = old.setReps; }
  const ok = type === 'custom' ? rec.customName && (rec.duration || rec.repetitions)
    : type === 'pushups' ? rec.repetitions : (rec.duration || rec.distance);
  if (!ok) return toast(type === 'custom' ? 'Add a name and duration or reps' : 'Enter at least one value');
  rec.estimatedCalories = estCalories(type, rec.duration, curWeight());
  await save('activities', rec);
  try { localStorage.setItem('m_lastType', type); } catch {}
  toast(id ? 'Saved' : 'Logged ✓');
  location.hash = '#dashboard';
}

// --- weight
let editW = null;
let CR = 0; // chart range in days, 0 = all
function chart(points, target) {
  if (points.length < 2) return `<div class="empty">Log at least two weights in this range to see a trend.</div>`;
  const W = 320, H = 160, px = 30, py = 16;
  const vals = points.map(p => p.weight); if (target != null) vals.push(target);
  let lo = Math.min(...vals), hi = Math.max(...vals); if (hi - lo < 1) { lo -= .5; hi += .5; }
  const pad = (hi - lo) * .12; lo -= pad; hi += pad;
  const t0 = parseKey(points[0].date).getTime(), t1 = parseKey(points[points.length - 1].date).getTime();
  const X = d => px + (t1 === t0 ? 0.5 : (parseKey(d).getTime() - t0) / (t1 - t0)) * (W - px - 14);
  const Y = w => py + (1 - (w - lo) / (hi - lo)) * (H - 2 * py - 6);
  const pts = points.map(p => [X(p.date), Y(p.weight)]);
  const line = pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
  const area = `${pts[0][0].toFixed(1)},${H - py} ${line} ${pts[pts.length - 1][0].toFixed(1)},${H - py}`;
  const grid = [0, 1, 2].map(i => { const v = hi - (hi - lo) * (i / 2.4 + .05); return `<line x1="${px}" x2="${W - 8}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="2" y="${Y(v) + 3}" class="gt">${f(v, 0)}</text>`; }).join('');
  const last = pts[pts.length - 1];
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend"><defs><linearGradient id="ga" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="currentColor" stop-opacity=".12"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></linearGradient></defs>
    ${grid}
    ${target != null ? `<line x1="${px}" x2="${W - 8}" y1="${Y(target)}" y2="${Y(target)}" class="goalline"/><rect x="${W - 62}" y="${Y(target) - 17}" width="54" height="16" rx="8" style="fill:var(--ink)"/><text x="${W - 35}" y="${Y(target) - 6}" font-size="9.5" font-weight="700" text-anchor="middle" style="fill:var(--bg)">Goal ${f(target)}</text>` : ''}
    <polygon points="${area}" fill="url(#ga)"/><polyline points="${line}" class="ln"/>
    ${pts.length <= 40 ? pts.map(p => `<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="3" class="dot"/>`).join('') : ''}
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="5.5" class="dot now"/>
    <text x="${px}" y="${H - 2}" class="gt">${esc(fmtDay(points[0].date))}</text><text x="${W - 8}" y="${H - 2}" text-anchor="end" class="gt">${esc(fmtDay(points[points.length - 1].date))}</text></svg>`;
}
function vWeight() {
  const p = S.profile, ws = sortedWeights();
  const e = editW ? S.weights.find(x => x.id === editW) : null;
  const dflt = e ? e.weight : (curWeight() ?? '');
  let h = `<form id="weightForm" class="card" data-id="${e?.id || ''}"><h2>${e ? 'Edit weight' : 'Record weight'}</h2>
    <div class="two"><label>Weight (kg)<input name="weight" type="number" inputmode="decimal" step="0.1" min="1" required value="${esc(dflt)}" ${e ? '' : 'autofocus'}></label>
    <label>Date<input name="date" type="date" required max="${today()}" value="${e?.date || today()}"></label></div>
    <label>Notes (optional)<input name="notes" maxlength="200" value="${esc(e?.notes || '')}"></label>
    <button class="primary full" type="submit">${e ? 'Save changes' : 'Save weight'}</button>
    ${e ? `<p><button type="button" class="full" data-act="cancel-w">Cancel</button> <button type="button" class="danger full" style="margin-top:8px" data-act="del-w" data-id="${e.id}">Delete</button></p>` : ''}</form>`;
  const pr = progress();
  h += `<div class="card"><h2>Trend</h2><div class="chips seg">${[[7, '1W'], [30, '1M'], [90, '3M'], [0, 'All']].map(([d, l]) => `<button data-act="crange" data-d="${d}" class="${CR === d ? 'on' : ''}">${l}</button>`).join('')}</div>${chart(CR ? ws.filter(w => w.date >= addDays(today(), -CR)) : ws, p?.targetWeight)}${pr ? `${bar(pr.pct)}<div class="sub">${f(pr.pct, 0)}% of the way from ${f(p.startingWeight)} to ${f(p.targetWeight)} kg</div>` : ''}</div>`;
  h += `<form id="profileForm" class="card"><h2>${p ? 'Goal weights' : 'Set your weights'}</h2>
    <div class="two"><label>Starting (kg)<input name="start" type="number" inputmode="decimal" step="0.1" min="1" required value="${esc(p?.startingWeight ?? '')}"></label>
    <label>Target (kg)<input name="target" type="number" inputmode="decimal" step="0.1" min="1" required value="${esc(p?.targetWeight ?? '')}"></label></div>
    <button class="full" type="submit">${p ? 'Update' : 'Save'}</button></form>`;
  h += `<div class="card"><h2>Records</h2>${ws.length ? [...ws].reverse().map((w, i, arr) => { const prev = arr[i + 1]; const d = prev ? w.weight - prev.weight : null;
    return `<div class="item"><div><b>${f(w.weight)} kg</b> ${d != null && d !== 0 ? `<span class="sub">(${d > 0 ? '+' : ''}${f(d)})</span>` : ''}<div class="sub">${esc(fmtDay(w.date))}${w.notes ? ' · ' + esc(w.notes) : ''}</div></div><button data-act="edit-w" data-id="${w.id}">Edit</button></div>`; }).join('') : '<div class="empty">No weights yet.</div>'}</div>`;
  return h;
}
async function submitWeight(form) {
  const fd = new FormData(form), w = num(fd.get('weight'));
  if (!w || w <= 0) return toast('Enter a valid weight');
  await save('weights', { id: form.dataset.id || uid(), ts: Date.now(), date: fd.get('date'), weight: w, notes: (fd.get('notes') || '').trim() });
  editW = null; toast('Weight saved ✓'); render();
}
async function submitProfile(form) {
  const fd = new FormData(form), s = num(fd.get('start')), t = num(fd.get('target'));
  if (!s || !t) return toast('Enter both weights');
  const first = !S.profile;
  await save('profile', { id: 'me', startingWeight: s, targetWeight: t, weightUnit: 'kg', createdAt: S.profile?.createdAt || new Date().toISOString() });
  if (first && !S.weights.length) await save('weights', { id: uid(), ts: Date.now() - 1, date: today(), weight: s, notes: 'Starting weight' });
  toast('Saved ✓'); render();
}

// --- history
const H = { from: '', to: '' };
function vHistory() {
  const inR = k => (!H.from || k >= H.from) && (!H.to || k <= H.to);
  const acts = S.activities.filter(a => inR(a.date.slice(0, 10))).sort((a, b) => b.date.localeCompare(a.date));
  const ws = sortedWeights().filter(w => inR(w.date)).reverse();
  let h = `<div class="card"><h2>Filter</h2><div class="chips"><button data-act="range" data-d="7">7 days</button><button data-act="range" data-d="30">30 days</button><button data-act="range" data-d="0">All</button></div>
    <div class="two"><label>From<input id="hFrom" type="date" value="${H.from}"></label><label>To<input id="hTo" type="date" value="${H.to}"></label></div></div>`;
  const t = totals(acts);
  h += `<div class="card"><h2>Exercise frequency</h2>${totalsHTML(t)}</div>`;
  const weeks = {}; acts.forEach(a => (weeks[weekStart(a.date.slice(0, 10))] ||= []).push(a));
  h += `<div class="card"><h2>Weekly summaries</h2>${Object.keys(weeks).length ? Object.keys(weeks).sort().reverse().map(k => { const x = totals(weeks[k]);
    return `<div class="item"><div><b>Week of ${esc(fmtDay(k))}</b><div class="sub">${x.sessions} sessions · ${x.days} days · ${f(x.min, 0)} min · ${f(x.km)} km${x.reps ? ` · ${x.reps} reps` : ''}</div></div></div>`; }).join('') : emptyArt('nodata', 'No activity in range.')}</div>`;
  const days = {}; acts.forEach(a => (days[a.date.slice(0, 10)] ||= []).push(a));
  h += `<div class="card"><h2>Daily log</h2>${Object.keys(days).length ? Object.keys(days).sort().reverse().map(k => `<div class="sub" style="margin-top:8px"><b>${esc(fmtDay(k))}</b></div>${days[k].map(actRow).join('')}`).join('') : emptyArt('nodata', 'No activity in range.')}</div>`;
  const wdays = [...new Set(S.water.filter(x => x.type === 'entry' && inR(x.date)).map(x => x.date))].sort().reverse();
  h += `<div class="card"><h2>Water</h2>${wdays.length ? wdays.map(k => { const v = waterSum(k); return `<div class="item"><span>${esc(fmtDay(k))}</span><b>${esc(fmtL(v))}${v >= waterGoal() ? ' ✓' : ''}</b></div>`; }).join('') : '<div class="empty">No water logged in range.</div>'}</div>`;
  h += `<div class="card"><h2>Weight measurements</h2>${ws.length ? ws.map(w => `<div class="item"><span>${esc(fmtDay(w.date))}</span><b>${f(w.weight)} kg</b></div>`).join('') : '<div class="empty">No weights in range.</div>'}</div>`;
  const on = !!lsGet('m_key');
  h += `<div class="card"><h2>Sync</h2><div class="sub" id="syncStatus" style="margin-bottom:10px">${esc(syncText())}</div>
    ${on ? `<div class="two"><button data-act="sync-now">Sync now</button><button class="danger" data-act="sync-off">Disconnect</button></div>`
    : `<label>Passphrase<input id="syncKey" type="password" autocomplete="off" placeholder="Set in your server settings"></label><button class="primary full" data-act="sync-connect">Connect</button>`}
    <div class="sub" style="margin-top:10px">Your data always lives on this device. When connected it is also saved to your Momentum database, so every device you sign in on stays in step.</div></div>`;
  h += `<div class="card"><h2>Your data</h2><div class="sub" style="margin-bottom:10px">Export a copy to back it up or move it elsewhere.</div>
    <div class="two"><button data-act="export-json">Export JSON</button><button data-act="export-csv">Export CSV</button></div>
    <p><label>Restore from JSON backup<input id="importFile" type="file" accept="application/json,.json"></label></p></div>`;
  return h;
}

// --- goals dialog
function goalForm(g) {
  const type = g.activityType, units = UNITS[type];
  return `<form id="goalForm" data-id="${g.id || ''}">${sheetHead(g.id ? 'Edit goal' : 'New goal', 'Pick a target to hit')}
    <label>Activity<select name="activityType" id="gType">${['cycling', 'running', 'pushups', 'walking', 'any'].map(k => `<option value="${k}" ${k === type ? 'selected' : ''}>${k === 'any' ? 'Any exercise (active days)' : TYPES[k]}</option>`).join('')}</select></label>
    <div class="two"><label>Target<input name="targetValue" type="number" inputmode="decimal" min="1" step="any" required value="${esc(g.targetValue ?? '')}"></label>
    <label>Unit<select name="targetUnit">${units.map(u => `<option value="${u}" ${u === g.targetUnit ? 'selected' : ''}>${UNIT_LABEL[u]}</option>`).join('')}</select></label></div>
    <label>Frequency<select name="frequency">${['daily', 'weekly'].map(x => `<option value="${x}" ${x === g.frequency ? 'selected' : ''} ${type === 'any' && x === 'daily' ? 'disabled' : ''}>${x}</option>`).join('')}</select></label>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="active" style="width:auto;margin:0;min-height:0" ${g.active ? 'checked' : ''}> Active</label>
    <button class="cta" type="submit">Save goal</button>
    ${g.id ? `<button type="button" class="danger full" style="margin-top:10px" data-act="del-goal" data-id="${g.id}">Delete goal</button>` : ''}</form>`;
}
function openGoal(id) {
  const g = id ? S.goals.find(x => x.id === id) : { activityType: 'cycling', targetValue: 30, targetUnit: 'min', frequency: 'daily', active: true };
  $('#dlg').innerHTML = goalForm(g); $('#dlg').showModal();
}
async function submitGoal(form) {
  const fd = new FormData(form), type = fd.get('activityType'), v = num(fd.get('targetValue'));
  if (!v || v <= 0) return toast('Enter a target');
  await save('goals', { id: form.dataset.id || uid(), activityType: type, targetValue: v, targetUnit: fd.get('targetUnit'), frequency: type === 'any' ? 'weekly' : fd.get('frequency'), active: !!fd.get('active') });
  closeSheet(); toast('Goal saved ✓'); render();
}

// --- export / import
function download(name, text, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime })); a.download = name;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function exportCSV() {
  const q = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v; };
  const rows = [['record', 'date', 'activity', 'duration_min', 'distance_km', 'repetitions', 'sets', 'rpm', 'estimated_calories', 'weight_kg', 'notes']];
  sortedWeights().forEach(w => rows.push(['weight', w.date, '', '', '', '', '', '', '', w.weight, w.notes]));
  [...S.activities].sort((a, b) => a.date.localeCompare(b.date)).forEach(a => rows.push(['activity', a.date, actTitle(a), a.duration, a.distance, a.repetitions, a.sets, a.rpm, a.estimatedCalories, '', a.notes]));
  download(`momentum-${today()}.csv`, rows.map(r => r.map(q).join(',')).join('\n'), 'text/csv');
}
const exportJSON = () => download(`momentum-${today()}.json`, JSON.stringify({ app: 'momentum', version: 1, exportedAt: new Date().toISOString(), ...S }, null, 2), 'application/json');
async function importJSON(file) {
  try {
    const d = JSON.parse(await file.text());
    if (d.app !== 'momentum') throw 0;
    if (!confirm('Merge this backup into your data? Entries with matching IDs are overwritten.')) return;
    if (d.profile) await save('profile', d.profile);
    for (const k of ['weights', 'activities', 'goals', 'water']) for (const r of d[k] || []) await save(k, r);
    toast('Backup restored ✓'); render();
  } catch { toast('Not a valid Momentum backup'); }
}

// ---------- live workout (timers) ----------
const WS_KEY = 'm_ws';
let WS = null;
try { WS = JSON.parse(localStorage.getItem(WS_KEY)); } catch {}
const persistWS = () => { try { WS ? localStorage.setItem(WS_KEY, JSON.stringify(WS)) : localStorage.removeItem(WS_KEY); } catch {} };
const wsElapsed = w => w.acc + (w.run ? Date.now() - w.since : 0);
const fmtClock = ms => { const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return `${h ? h + ':' + pad(m) : pad(m)}:${pad(s % 60)}`; };
const isCardio = t => t !== 'pushups';
function newWS(type) {
  const g = S.goals.find(x => x.active && x.frequency === 'daily' && x.activityType === type && x.targetUnit === 'min');
  const now = Date.now();
  return { type, start: now, run: type === 'pushups', acc: 0, since: now, target: g ? g.targetValue : 0, dist: '', cur: 0, sets: [], rest: null, restLen: 60, notified: false };
}
function beep() {
  try { const A = window.AudioContext || window.webkitAudioContext, c = new A(), o = c.createOscillator(), g = c.createGain(); o.connect(g); g.connect(c.destination); o.frequency.value = 880; g.gain.setValueAtTime(.2, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + .5); o.start(); o.stop(c.currentTime + .5); } catch {}
  try { navigator.vibrate && navigator.vibrate([200, 80, 200]); } catch {}
}
let wl = null;
async function wake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
    else if (!on && wl) { await wl.release(); wl = null; }
  } catch {}
}
const wsStats = w => {
  const ms = wsElapsed(w), mins = ms / 60000, d = num(w.dist), out = [];
  const kc = estCalories(w.type, mins, curWeight()); if (kc) out.push(`~${kc} kcal (est.)`);
  if (d && mins) out.push(w.type === 'cycling' ? `${f(d / (mins / 60))} km/h` : `${fmtPace(mins / d)} /km`);
  return out.join(' · ');
};
function vWorkout() {
  const w = WS, label = TYPES[w.type];
  const head = `<div class="row"><h2 style="margin:0">${label}</h2><span><a class="link" href="#dashboard" style="color:var(--sub);font-size:13px">Minimise</a> &nbsp; <button class="link" data-act="ws-cancel" style="color:var(--sub)">Discard</button></span></div>`;
  if (w.type === 'pushups') {
    const total = w.sets.reduce((a, b) => a + b, 0) + w.cur;
    const resting = w.rest && w.rest.end > Date.now();
    return `<div class="card ws" id="ws" style="--h:${HUE[w.type]}">${head}
      <div class="sub" style="text-align:center;margin-top:6px">Workout time <b id="tm">${fmtClock(wsElapsed(w))}</b> · <b id="wsTotal">${total}</b> total reps</div>
      ${resting ? `<div class="rest" style="text-align:center">${ring(100, 220, `<div class="sub">Rest</div><div class="timer" id="rtm">${fmtClock(w.rest.end - Date.now())}</div>`, 14)}
        <div class="two" style="margin-top:12px"><button data-act="ws-rest-add">+15 s</button><button class="primary" data-act="ws-rest-skip">Skip rest</button></div></div>`
      : `<div class="reps" id="reps">${w.cur}</div><div class="sub" style="text-align:center">Set ${w.sets.length + 1} · tap to count</div>
        <button class="repbtn" data-act="ws-rep" data-n="1">+1</button>
        <div class="two"><button data-act="ws-rep" data-n="-1">−1</button><button data-act="ws-rep" data-n="5">+5</button></div>
        <button class="primary full" style="margin-top:10px" data-act="ws-setdone" ${w.cur ? '' : 'disabled'}>Set done · rest ${w.restLen}s</button>
        <div class="chips" style="margin:12px 0 0;justify-content:center">${[30, 60, 90, 120].map(s => `<button data-act="ws-restlen" data-s="${s}" class="${w.restLen === s ? 'on' : ''}">${s}s</button>`).join('')}</div>`}
      ${w.sets.length ? `<div style="margin-top:12px">${w.sets.map((r, i) => `<div class="item"><span>Set ${i + 1}</span><b>${r} reps</b></div>`).join('')}</div>` : ''}
      <button class="full" style="margin-top:12px" data-act="ws-finish">Finish &amp; save</button></div>`;
  }
  const ms = wsElapsed(w), pct = w.target ? (ms / (w.target * 60000)) * 100 : 0;
  return `<div class="card ws" id="ws" style="--h:${HUE[w.type]}">${head}
    <div style="text-align:center;margin-top:6px">${ring(w.target ? pct : (w.run ? 100 : 0), 240, `<div class="timer" id="tm">${fmtClock(ms)}</div><div class="sub" id="tsub">${w.target ? `of ${fmtClock(w.target * 60000)}` : (w.run ? 'running' : 'ready')}</div>`, 14)}</div>
    <div class="sub" id="wsStats" style="text-align:center;min-height:20px;margin:6px 0 10px">${esc(wsStats(w))}</div>
    <div class="two"><button class="primary" data-act="ws-toggle" style="min-height:56px;font-size:18px">${w.run ? 'Pause' : ms > 0 ? 'Resume' : 'Start'}</button><button data-act="ws-finish" style="min-height:56px" ${ms > 0 ? '' : 'disabled'}>Finish</button></div>
    ${w.type === 'cycling' || w.type === 'running' || w.type === 'walking' ? `<label style="margin-top:14px">Distance so far (km, optional)<input id="wsDist" type="number" inputmode="decimal" min="0" step="any" value="${esc(w.dist)}"></label>` : ''}
    <div class="sub" style="margin:4px 0 6px">Target time</div>
    <div class="chips">${[0, 15, 20, 30, 45, 60].map(m => `<button data-act="ws-target" data-m="${m}" class="${w.target === m ? 'on' : ''}">${m ? m + ' min' : 'None'}</button>`).join('')}</div></div>`;
}
let ticker = null;
function stopTick() { clearInterval(ticker); ticker = null; }
function tick() {
  const w = WS; if (!w) return;
  const live = $('#liveT'); if (live) live.textContent = fmtClock(wsElapsed(w));
  if (!$('#ws')) return;
  const ms = wsElapsed(w);
  if (w.type === 'pushups') {
    const tm = $('#tm'); if (tm) tm.textContent = fmtClock(ms);
    if (w.rest) {
      const left = w.rest.end - Date.now();
      if (left <= 0) { w.rest = null; persistWS(); beep(); render(); return; }
      const r = $('#rtm'); if (r) r.textContent = fmtClock(left);
      const c = $('#ws .rp'); if (c) { const len = c.getAttribute('stroke-dasharray'); c.setAttribute('stroke-dashoffset', len * (1 - left / (w.rest.len * 1000))); }
    }
    return;
  }
  const tm = $('#tm'); if (tm) tm.textContent = fmtClock(ms);
  const fin = $('[data-act=ws-finish]'); if (fin) fin.disabled = ms <= 0;
  const st = $('#wsStats'); if (st) st.textContent = wsStats(w);
  const c = $('#ws .rp');
  if (c) { const len = c.getAttribute('stroke-dasharray'); const p = w.target ? Math.min(1, ms / (w.target * 60000)) : (w.run ? 1 : 0); c.setAttribute('stroke-dashoffset', len * (1 - p)); }
  if (w.target && !w.notified && ms >= w.target * 60000) { w.notified = true; persistWS(); beep(); toast('Target reached 🎯'); }
}
function startTick() { if (!ticker) ticker = setInterval(tick, 250); }
function discardWS() { WS = null; persistWS(); wake(false); stopTick(); location.hash = '#dashboard'; }
async function finishWS() {
  const w = WS; if (!w) return;
  const ms = wsElapsed(w);
  let rec;
  if (w.type === 'pushups') {
    const sets = [...w.sets]; if (w.cur > 0) sets.push(w.cur);
    const total = sets.reduce((a, b) => a + b, 0);
    if (!total) { if (!confirm('No reps counted. Discard this workout?')) return; return discardWS(); }
    rec = { id: uid(), activityType: 'pushups', date: tKey(new Date(w.start)), duration: ms >= 30000 ? f(ms / 60000, 2) : null, distance: null, repetitions: total, sets: 1, setReps: sets, rpm: null, estimatedCalories: null, notes: '' };
  } else {
    if (ms < 10000) { if (!confirm('That was under 10 seconds. Discard this workout?')) return; return discardWS(); }
    const dur = f(ms / 60000, 2), dist = num($('#wsDist')?.value ?? w.dist);
    rec = { id: uid(), activityType: w.type, date: tKey(new Date(w.start)), duration: dur, distance: dist || null, repetitions: null, sets: null, rpm: null, estimatedCalories: estCalories(w.type, dur, curWeight()), notes: '' };
  }
  await save('activities', rec);
  WS = null; persistWS(); wake(false); stopTick();
  toast('Workout saved ✓'); haptic([12, 50, 12, 50, 24]); location.hash = '#dashboard';
}
function wsAction(act, el) {
  const w = WS; if (!w) return;
  if (act === 'ws-toggle') {
    if (w.run) { w.acc += Date.now() - w.since; w.run = false; wake(false); } else { w.since = Date.now(); w.run = true; wake(true); }
  } else if (act === 'ws-target') { w.target = +el.dataset.m; w.notified = false; }
  else if (act === 'ws-rep') {
    w.cur = Math.max(0, w.cur + +el.dataset.n); persistWS();
    const r = $('#reps'); if (r) { r.textContent = w.cur; r.classList.remove('bump'); void r.offsetWidth; r.classList.add('bump'); }
    const tt = $('#wsTotal'); if (tt) tt.textContent = w.sets.reduce((a, b) => a + b, 0) + w.cur;
    const sd = $('[data-act=ws-setdone]'); if (sd) sd.disabled = !w.cur;
    return;
  }
  else if (act === 'ws-setdone') { if (!w.cur) return; w.sets.push(w.cur); w.cur = 0; w.rest = { end: Date.now() + w.restLen * 1000, len: w.restLen }; }
  else if (act === 'ws-restlen') { w.restLen = +el.dataset.s; }
  else if (act === 'ws-rest-skip') { w.rest = null; }
  else if (act === 'ws-rest-add') { if (w.rest) { w.rest.end += 15000; w.rest.len += 15; } }
  else if (act === 'ws-cancel') { if (confirm('Discard this workout?')) discardWS(); return; }
  else if (act === 'ws-finish') { finishWS().catch(() => toast('Could not save')); return; }
  persistWS(); render();
}

// ---------- sync (local-first; IndexedDB is the source the UI reads, the server database is the shared copy) ----------
const lsGet = k => { try { return localStorage.getItem(k) || ''; } catch { return ''; } };
const lsSet = (k, v) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };
const SY = { state: lsGet('m_key') ? 'idle' : 'off', msg: '', last: +lsGet('m_last') || 0 };
let syncing = false, syncAgain = false, syncT;
function setSY(state, msg = '') {
  SY.state = state; SY.msg = msg;
  const d = $('#syncdot'); if (d) { d.dataset.s = state; d.hidden = state === 'off'; d.title = msg || state; }
  const t = $('#syncStatus'); if (t) t.textContent = syncText();
}
const syncText = () => SY.state === 'off' ? 'Not connected — data is only on this device.' : SY.state === 'syncing' ? 'Syncing…' : SY.state === 'error' ? `Sync problem: ${SY.msg}` : `Synced${SY.last ? ' ' + new Date(SY.last).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`;
function queueSync() { clearTimeout(syncT); syncT = setTimeout(sync, 700); }
async function sync() {
  const key = lsGet('m_key');
  if (!key) return setSY('off');
  if (!navigator.onLine) return setSY('error', 'offline — will sync when back online');
  if (syncing) { syncAgain = true; return; }
  syncing = true; setSY('syncing');
  try {
    const out = (await dbAll('outbox')).slice(0, 200);
    const res = await fetch('/api/sync', { method: 'POST', headers: { 'content-type': 'application/json', 'x-momentum-key': key }, body: JSON.stringify({ since: +lsGet('m_since') || 0, changes: out.map(({ store, id, data, updatedAt, deleted }) => ({ store, id, data, updatedAt, deleted })) }) });
    if (res.status === 401) throw new Error('wrong passphrase');
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || (res.status === 404 || res.status === 405 ? 'server database not available here' : `server error ${res.status}`)); }
    const d = await res.json();
    // drop outbox entries that were sent and haven't been edited since
    const now = new Map((await dbAll('outbox')).map(o => [o.key, o]));
    for (const o of out) if (now.get(o.key)?.updatedAt === o.updatedAt) await tx('outbox', 'readwrite', s => s.delete(o.key));
    const pending = new Map((await dbAll('outbox')).map(o => [o.key, o]));
    let changed = false;
    for (const r of d.records) {
      const p = pending.get(`${r.store}:${r.id}`);
      if (p && p.updatedAt >= r.updatedAt) continue;
      const local = r.store === 'profile' ? S.profile : S[r.store]?.find(x => x.id === r.id);
      if (local && (local.updatedAt || 0) >= r.updatedAt) continue;
      if (r.deleted) { if (local) { await remove(r.store, r.id, { remote: true }); changed = true; } }
      else if (r.data) { await save(r.store, { ...r.data, updatedAt: r.updatedAt }, { remote: true }); changed = true; }
    }
    lsSet('m_since', String(d.rev)); SY.last = Date.now(); lsSet('m_last', String(SY.last));
    if (d.more || out.length === 200) syncAgain = true;
    setSY('idle');
    const busy = document.activeElement?.matches?.('input,select,textarea') || $('#dlg')?.open || location.hash.startsWith('#workout');
    if (changed && !busy) render();
  } catch (e) {
    setSY('error', e.message === 'Failed to fetch' ? 'cannot reach server' : e.message);
  } finally {
    syncing = false;
    if (syncAgain) { syncAgain = false; queueSync(); }
  }
}
async function connectSync(key) {
  lsSet('m_key', key); lsSet('m_since', '');
  // queue everything already on this device so the server gets a full copy
  if (S.profile) await save('profile', S.profile);
  for (const st of ['weights', 'activities', 'goals', 'water']) for (const r of [...S[st]]) await save(st, r);
  await sync();
  if (SY.state === 'error' && /passphrase|reach|available/.test(SY.msg)) { if (/passphrase/.test(SY.msg)) { lsSet('m_key', ''); } }
  render();
}


// ---------- bottom sheet + quick log (wheel picker) ----------
const sheetHead = (title, sub) => `<div class="shead"><div><h2>${title}</h2>${sub ? `<div class="ssub">${sub}</div>` : ''}</div><button type="button" class="x" data-act="close" aria-label="Close">${ic('x:bold')}</button></div>`;
const QL = { type: 'cycling', h: 0, m: 30, sets: 3, reps: 10 };
const QTYPES = ['cycling', 'running', 'walking', 'pushups'];
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const wheel = (id, lo, hi, val, label, step = 1) => `<div class="wcol"><div class="wheel" data-w="${id}" data-lo="${lo}" data-step="${step}" data-val="${val}">${range(0, Math.round((hi - lo) / step)).map(i => `<div>${lo + i * step}</div>`).join('')}</div><span class="wl">${label}</span></div>`;
let WSTATE = QL;
function quickSummary() {
  if (QL.type === 'pushups') return { ok: QL.sets > 0 && QL.reps > 0, text: `Log ${QL.sets} × ${QL.reps} push-ups` };
  const min = QL.h * 60 + QL.m, kc = estCalories(QL.type, min, curWeight());
  return { ok: min > 0, text: min ? `Log ${QL.h ? QL.h + ' h ' : ''}${QL.m ? QL.m + ' min' : ''}${kc ? ` · ~${kc} kcal` : ''}`.replace('h  ', 'h ') : 'Pick a duration' };
}
function fillQuick() {
  const pu = QL.type === 'pushups', q = quickSummary();
  $('#dlg').innerHTML = `${sheetHead('Quick log', 'What did you do?')}
    <div class="chips" style="margin:4px 0 8px">${QTYPES.map(t => `<button type="button" data-act="q-type" data-t="${t}" class="${QL.type === t ? 'on' : ''}">${TYPES[t]}</button>`).join('')}</div>
    <div class="wheels">${pu ? wheel('sets', 1, 12, QL.sets, 'sets') + wheel('reps', 1, 100, QL.reps, 'reps') : wheel('h', 0, 9, QL.h, 'hours') + wheel('m', 0, 59, QL.m, 'min')}</div>
    <button class="cta" id="qSave" data-act="q-save" ${q.ok ? '' : 'disabled'}>${esc(q.text)}</button>`;
  WSTATE = QL;
  $('#dlg').querySelectorAll('.wheel').forEach(w => { w.scrollTop = ((+w.dataset.val - +w.dataset.lo) / +(w.dataset.step || 1)) * 44; });
}
function openQuick() {
  QL.type = QTYPES.includes(lsGet('m_lastType')) ? lsGet('m_lastType') : 'cycling';
  fillQuick(); if (!$('#dlg').open) $('#dlg').showModal();
}
document.addEventListener('scroll', e => {
  const w = e.target; if (!w.classList || !w.classList.contains('wheel')) return;
  const v = +w.dataset.lo + Math.round(w.scrollTop / 44) * +(w.dataset.step || 1), k = w.dataset.w;
  if (WSTATE[k] === v) return;
  WSTATE[k] = v; buzz(4);
  if (WSTATE === WG) { const b = $('#wgSave'); if (b) b.textContent = `Set goal · ${fmtL(WG.ml)}`; return; }
  const q = quickSummary(), b = $('#qSave'); if (b) { b.textContent = q.text; b.disabled = !q.ok; }
}, true);
async function saveQuick() {
  const q = quickSummary(); if (!q.ok) return;
  const t = QL.type, min = QL.h * 60 + QL.m;
  const rec = { id: uid(), activityType: t, date: tKey(new Date()), duration: t === 'pushups' ? null : min, distance: null, repetitions: t === 'pushups' ? QL.reps : null, sets: t === 'pushups' ? QL.sets : null, rpm: null, estimatedCalories: t === 'pushups' ? null : estCalories(t, min, curWeight()), notes: '' };
  await save('activities', rec);
  try { localStorage.setItem('m_lastType', t); } catch {}
  closeSheet(); toast('Logged ✓'); haptic([10, 40, 16]); render();
}
function closeSheet() {
  const d = $('#dlg'); if (!d.open) return;
  d.classList.add('closing'); d.style.transform = ''; setTimeout(() => { d.close(); d.classList.remove('closing'); d.style.transform = ''; }, 220);
}
// swipe the top of the sheet down to dismiss (a fast flick counts too)
(() => {
  let y0 = 0, t0 = 0, dy = 0, on = false;
  const d = $('#dlg');
  d.addEventListener('pointerdown', e => { if (e.clientY - d.getBoundingClientRect().top > 72 || e.target.closest('button,input,select')) return; on = true; y0 = e.clientY; t0 = e.timeStamp; dy = 0; d.setPointerCapture(e.pointerId); d.style.transition = 'none'; });
  d.addEventListener('pointermove', e => { if (!on) return; dy = Math.max(0, e.clientY - y0); d.style.transform = `translateY(${dy}px)`; });
  const end = e => { if (!on) return; on = false; d.style.transition = ''; const v = dy / Math.max(1, e.timeStamp - t0); if (dy > 110 || v > .6) closeSheet(); else d.style.transform = ''; };
  d.addEventListener('pointerup', end); d.addEventListener('pointercancel', end);
  d.addEventListener('click', e => { const r = d.getBoundingClientRect(); if (e.target === d && (e.clientY < r.top || e.clientX < r.left || e.clientX > r.right)) closeSheet(); });
})();

// ---------- router + events ----------
const TABICON = { dashboard: 'house', log: 'note-pencil', weight: 'scales', history: 'clock' };
let lastRoute = '';
function render() {
  const [tab, arg] = (location.hash.slice(1) || 'dashboard').split('/');
  if (tab === 'workout') {
    if (WS && WS.type !== arg) { location.hash = `#workout/${WS.type}`; return; }
    if (!WS) {
      if (!TYPES[arg] || arg === 'custom') { location.hash = '#dashboard'; return; }
      WS = newWS(arg); persistWS(); if (WS.run) wake(true);
    }
  }
  const view = { dashboard: vDash, log: () => vLog(arg), weight: vWeight, history: vHistory, workout: vWorkout }[tab] || vDash;
  $('#view').dataset.anim = location.hash === lastRoute ? '' : '1'; lastRoute = location.hash;
  $('#view').innerHTML = view();
  const known = ['dashboard', 'log', 'weight', 'history'].includes(tab) ? tab : 'dashboard';
  document.querySelectorAll('.tabs a').forEach(a => { const on = a.dataset.tab === known && tab !== 'workout'; a.classList.toggle('on', on); a.innerHTML = ic(`${TABICON[a.dataset.tab]}:${on ? 'fill' : 'duotone'}`); });
  document.body.classList.toggle('in-workout', tab === 'workout');
  $('.tabs').style.setProperty('--i', ['dashboard', 'log', 'weight', 'history'].indexOf(known));
  if (WS) startTick(); else stopTick();
  syncLogForm();
  if (tab !== 'weight') editW = null;
}

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const { act, id } = el.dataset;
  if (act === 'type') { const form = $('#logForm'); form.dataset.type = el.dataset.type; syncLogForm(); }
  else if (act === 'crange') { CR = +el.dataset.d; render(); }
  else if (act === 'goal') openGoal(id);
  else if (act === 'close') closeSheet();
  else if (act === 'quick') openQuick();
  else if (act === 'q-type') { QL.type = el.dataset.t; fillQuick(); buzz(8); }
  else if (act === 'q-save') saveQuick().catch(() => toast('Could not save'));
  else if (act === 'water-add') addWater(+el.dataset.ml).catch(() => toast('Could not save'));
  else if (act === 'water-undo') undoWater();
  else if (act === 'water-goal') openWaterGoal();
  else if (act === 'wg-save') saveWaterGoal().catch(() => toast('Could not save'));
  else if (act === 'del-goal') { if (confirm('Delete this goal?')) { await remove('goals', id); closeSheet(); render(); } }
  else if (act === 'del-act') { if (confirm('Delete this entry? This cannot be undone.')) { await remove('activities', id); toast('Deleted'); location.hash = '#history'; } }
  else if (act === 'edit-w') { editW = id; render(); scrollTo(0, 0); }
  else if (act === 'cancel-w') { editW = null; render(); }
  else if (act === 'del-w') { if (confirm('Delete this weight record?')) { await remove('weights', id); editW = null; render(); } }
  else if (act === 'range') { const d = +el.dataset.d; H.to = ''; H.from = d ? addDays(today(), -(d - 1)) : ''; render(); }
  else if (act === 'export-json') exportJSON();
  else if (act === 'export-csv') exportCSV();
  else if (act.startsWith('ws-')) wsAction(act, el);
  else if (act === 'sync-connect') { const k = ($('#syncKey')?.value || '').trim(); if (!k) return toast('Enter your passphrase'); connectSync(k); }
  else if (act === 'sync-now') sync();
  else if (act === 'sync-off') { lsSet('m_key', ''); lsSet('m_since', ''); setSY('off'); render(); }
});
// Haptics: Vibration API where it exists (Android); on iOS Safari a hidden <input switch> gives a native tick per pulse.
let hxEl;
const hxTick = () => { if (!hxEl) { hxEl = document.createElement('label'); hxEl.style.cssText = 'position:fixed;left:-99px;top:-99px;opacity:0;pointer-events:none'; hxEl.innerHTML = '<input type="checkbox" switch tabindex="-1" aria-hidden="true">'; document.body.appendChild(hxEl); } hxEl.click(); };
function haptic(p) {
  try { if (navigator.vibrate) { navigator.vibrate(p); return; } } catch {}
  const seq = [].concat(p); let t = 0;
  seq.forEach((d, i) => { if (i % 2 === 0) setTimeout(hxTick, t); t += d; });
}
const buzz = n => haptic(n);
document.addEventListener('pointerdown', e => { if (e.target.closest('button:not(:disabled),a.tile,.tabs a,.fab,.wcard')) haptic(6); }, { passive: true });
document.addEventListener('submit', e => {
  e.preventDefault();
  const fn = { logForm: submitLog, weightForm: submitWeight, profileForm: submitProfile, goalForm: submitGoal }[e.target.id];
  if (fn) fn(e.target).catch(() => toast('Could not save'));
});
document.addEventListener('change', e => {
  if (e.target.id === 'hFrom') { H.from = e.target.value; render(); }
  else if (e.target.id === 'hTo') { H.to = e.target.value; render(); }
  else if (e.target.id === 'importFile' && e.target.files[0]) importJSON(e.target.files[0]);
  else if (e.target.id === 'gType') { // rebuild goal form for the new activity type's units
    const form = e.target.form, fd = new FormData(form), type = fd.get('activityType');
    $('#dlg').innerHTML = goalForm({ id: form.dataset.id, activityType: type, targetValue: num(fd.get('targetValue')) ?? '', targetUnit: UNITS[type][0], frequency: type === 'any' ? 'weekly' : fd.get('frequency'), active: !!fd.get('active') });
  }
});
document.addEventListener('input', e => { if (e.target.id === 'wsDist' && WS) { WS.dist = e.target.value; persistWS(); } });
addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
const setOffline = () => { $('#offline').hidden = navigator.onLine; };
addEventListener('online', () => { setOffline(); sync(); }); addEventListener('offline', setOffline);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (WS && WS.run) wake(true); tick(); sync(); } });
setInterval(() => { if (!document.hidden) sync(); }, 60000);

(async function init() {
  setOffline();
  try { db = await openDB(); await load(); }
  catch { $('#view').innerHTML = '<div class="card">Storage is unavailable in this browser mode, so Momentum cannot save data. Try a normal (non-private) window.</div>'; return; }
  $('.fab').innerHTML = ic('plus:bold');
  render(); setSY(lsGet('m_key') ? 'idle' : 'off'); sync();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
