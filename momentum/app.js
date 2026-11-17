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
const fmtTime = s => s.length > 10 ? s.slice(11, 16) : '';

const TYPES = { cycling: 'Cycling', pushups: 'Push-ups', walking: 'Walking', custom: 'Custom' };
const MET = { cycling: 6.8, walking: 3.5 }; // rough averages; calories are always labelled "est."
const UNITS = { cycling: ['min', 'km', 'sessions'], pushups: ['reps', 'sessions'], walking: ['min', 'km', 'sessions'], any: ['days'] };
const UNIT_LABEL = { min: 'min', km: 'km', reps: 'reps', sessions: 'sessions', days: 'days' };

// ---------- storage (IndexedDB) ----------
let db;
const STORES = ['profile', 'weights', 'activities', 'goals'];
const S = { profile: null, weights: [], activities: [], goals: [] };

const openDB = () => new Promise((res, rej) => {
  const r = indexedDB.open('momentum', 1);
  r.onupgradeneeded = () => STORES.forEach(s => r.result.createObjectStore(s, { keyPath: 'id' }));
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

async function save(store, rec) {
  await tx(store, 'readwrite', o => o.put(rec));
  if (store === 'profile') { S.profile = rec; return; }
  const i = S[store].findIndex(x => x.id === rec.id);
  if (i >= 0) S[store][i] = rec; else S[store].push(rec);
}
async function remove(store, id) {
  await tx(store, 'readwrite', o => o.delete(id));
  S[store] = S[store].filter(x => x.id !== id);
}
async function load() {
  const [p, w, a, g] = await Promise.all(STORES.map(dbAll));
  S.profile = p[0] || null; S.weights = w; S.activities = a; S.goals = g;
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
  if (a.repetitions) p.push(`${a.repetitions} reps${a.sets > 1 ? ` × ${a.sets} sets` : ''}`);
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
const bar = pct => `<div class="bar ${pct >= 100 ? 'done' : ''}"><i style="width:${pct}%"></i></div>`;
const actRow = a => `<div class="item"><div><b>${esc(actTitle(a))}</b> <span class="sub">${esc(fmtTime(a.date))}</span><div class="sub">${esc(actSummary(a))}${a.estimatedCalories ? ` · <span class="est">~${a.estimatedCalories} kcal (est.)</span>` : ''}</div>${a.notes ? `<div class="sub">“${esc(a.notes)}”</div>` : ''}</div><a class="btn" href="#log/${a.id}">Edit</a></div>`;

// ---------- views ----------
function vDash() {
  const pr = progress(), t = today(), ws = weekStart();
  let h = '';
  if (!pr) {
    h += `<div class="card"><h2>Welcome</h2><div class="sub">Set your starting and target weight to track progress.</div><p><a class="btn primary full" style="text-align:center" href="#weight">Set weights</a></p></div>`;
  } else {
    const verb = pr.mode === 'gain' ? 'Gained' : 'Lost';
    const change = pr.mode === 'gain' ? pr.moved : -pr.moved;
    const remain = Math.max(0, Math.abs(S.profile.targetWeight - pr.cur));
    h += `<div class="card"><div class="row"><div><div class="sub">Current weight</div><div class="big">${f(pr.cur)} <small class="sub">kg</small></div></div><div style="text-align:right"><div class="sub">${change >= 0 ? verb : (pr.mode === 'gain' ? 'Lost' : 'Gained')}</div><b>${f(Math.abs(change))} kg</b></div></div>${bar(pr.pct)}<div class="row sub"><span>Start ${f(S.profile.startingWeight)}</span><span>${f(pr.pct, 0)}% · ${f(remain)} kg to go</span><span>Target ${f(S.profile.targetWeight)}</span></div></div>`;
  }
  const act = S.goals.filter(g => g.active);
  const daily = act.filter(g => g.frequency === 'daily'), weekly = act.filter(g => g.frequency === 'weekly');
  const gl = g => { const p = goalProg(g); return `<div class="goal"><div class="row"><span>${esc(goalName(g))}</span><span class="sub">${f(p.v)} / ${f(g.targetValue)}</span></div>${bar(p.pct)}</div>`; };
  h += `<div class="card"><h2>Goals <button class="link" data-act="goal" data-id="">+ Add</button></h2>`;
  if (!act.length) h += `<div class="empty">No active goals. Add one, e.g. 30 min cycling daily.</div>`;
  if (daily.length) h += `<div class="sub" style="margin-bottom:6px">Today</div>${daily.map(gl).join('')}`;
  if (weekly.length) h += `<div class="sub" style="margin:8px 0 6px">This week</div>${weekly.map(gl).join('')}`;
  if (S.goals.length) h += `<div style="margin-top:10px">${S.goals.map(g => `<button class="link" data-act="goal" data-id="${g.id}">${g.active ? '' : '(paused) '}Edit: ${esc(goalName(g))}</button>`).join('<br>')}</div>`;
  h += `</div>`;
  const todays = S.activities.filter(a => a.date.startsWith(t)).sort((a, b) => b.date.localeCompare(a.date));
  h += `<div class="card"><h2>Today <a class="btn primary" href="#log">+ Log</a></h2>${todays.length ? todays.map(actRow).join('') : '<div class="empty">Nothing logged yet today.</div>'}</div>`;
  const wk = S.activities.filter(a => a.date.slice(0, 10) >= ws);
  h += `<div class="card"><h2>This week</h2>${totalsHTML(totals(wk))}</div>`;
  return h;
}

// --- log / edit activity
function logFields(a) {
  const v = k => esc(a[k] ?? '');
  const t = (types, inner) => `<div data-types="${types}">${inner}</div>`;
  return `
  ${t('custom', `<label>Name<input name="customName" value="${v('customName')}" maxlength="40" placeholder="e.g. Squats"></label>`)}
  <div class="two">
  ${t('cycling walking custom', `<label>Duration (min)<input name="duration" type="number" inputmode="decimal" min="0" step="any" value="${v('duration')}"></label>`)}
  ${t('cycling walking', `<label>Distance (km)<input name="distance" type="number" inputmode="decimal" min="0" step="any" value="${v('distance')}"></label>`)}
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
  if (['cycling', 'walking', 'custom'].includes(type)) rec.duration = num(fd.get('duration'));
  if (['cycling', 'walking'].includes(type)) rec.distance = num(fd.get('distance'));
  if (type === 'cycling') rec.rpm = num(fd.get('rpm'));
  if (['pushups', 'custom'].includes(type)) { rec.repetitions = num(fd.get('repetitions')); rec.sets = rec.repetitions ? (num(fd.get('sets')) || 1) : null; }
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
function chart(points, target) {
  if (points.length < 2) return `<div class="empty">Log at least two weights to see a trend.</div>`;
  const W = 320, H = 140, px = 34, py = 14;
  const vals = points.map(p => p.weight); if (target != null) vals.push(target);
  let lo = Math.min(...vals), hi = Math.max(...vals); if (hi - lo < 1) { lo -= .5; hi += .5; }
  const t0 = parseKey(points[0].date).getTime(), t1 = parseKey(points[points.length - 1].date).getTime();
  const X = d => px + (t1 === t0 ? 0.5 : (parseKey(d).getTime() - t0) / (t1 - t0)) * (W - px - 8);
  const Y = w => py + (1 - (w - lo) / (hi - lo)) * (H - 2 * py);
  const line = points.map(p => `${X(p.date).toFixed(1)},${Y(p.weight).toFixed(1)}`).join(' ');
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend">
    <text x="2" y="${py + 4}" font-size="10" fill="#909090">${f(hi)}</text><text x="2" y="${H - py + 4}" font-size="10" fill="#909090">${f(lo)}</text>
    ${target != null ? `<line x1="${px}" x2="${W - 8}" y1="${Y(target)}" y2="${Y(target)}" stroke="#8EE600" stroke-dasharray="4 4"/><text x="${W - 8}" y="${Y(target) - 3}" font-size="10" text-anchor="end" fill="#4d7c0f">target</text>` : ''}
    <polyline points="${line}" fill="none" stroke="#4d7c0f" stroke-width="2.5" stroke-linejoin="round"/>
    ${points.map(p => `<circle cx="${X(p.date).toFixed(1)}" cy="${Y(p.weight).toFixed(1)}" r="3" fill="#8EE600" stroke="#4d7c0f"/>`).join('')}
    <text x="${px}" y="${H - 1}" font-size="10" fill="#909090">${esc(fmtDay(points[0].date))}</text><text x="${W - 8}" y="${H - 1}" font-size="10" text-anchor="end" fill="#909090">${esc(fmtDay(points[points.length - 1].date))}</text></svg>`;
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
  h += `<div class="card"><h2>Trend</h2>${chart(ws, p?.targetWeight)}${pr ? `${bar(pr.pct)}<div class="sub">${f(pr.pct, 0)}% of the way from ${f(p.startingWeight)} to ${f(p.targetWeight)} kg</div>` : ''}</div>`;
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
    return `<div class="item"><div><b>Week of ${esc(fmtDay(k))}</b><div class="sub">${x.sessions} sessions · ${x.days} days · ${f(x.min, 0)} min · ${f(x.km)} km${x.reps ? ` · ${x.reps} reps` : ''}</div></div></div>`; }).join('') : '<div class="empty">No activity in range.</div>'}</div>`;
  const days = {}; acts.forEach(a => (days[a.date.slice(0, 10)] ||= []).push(a));
  h += `<div class="card"><h2>Daily log</h2>${Object.keys(days).length ? Object.keys(days).sort().reverse().map(k => `<div class="sub" style="margin-top:8px"><b>${esc(fmtDay(k))}</b></div>${days[k].map(actRow).join('')}`).join('') : '<div class="empty">No activity in range.</div>'}</div>`;
  h += `<div class="card"><h2>Weight measurements</h2>${ws.length ? ws.map(w => `<div class="item"><span>${esc(fmtDay(w.date))}</span><b>${f(w.weight)} kg</b></div>`).join('') : '<div class="empty">No weights in range.</div>'}</div>`;
  h += `<div class="card"><h2>Your data</h2><div class="sub" style="margin-bottom:10px">Stored only on this device. Export to back it up.</div>
    <div class="two"><button data-act="export-json">Export JSON</button><button data-act="export-csv">Export CSV</button></div>
    <p><label>Restore from JSON backup<input id="importFile" type="file" accept="application/json,.json"></label></p></div>`;
  return h;
}

// --- goals dialog
function goalForm(g) {
  const type = g.activityType, units = UNITS[type];
  return `<form id="goalForm" data-id="${g.id || ''}"><h2>${g.id ? 'Edit goal' : 'New goal'}</h2>
    <label>Activity<select name="activityType" id="gType">${['cycling', 'pushups', 'walking', 'any'].map(k => `<option value="${k}" ${k === type ? 'selected' : ''}>${k === 'any' ? 'Any exercise (active days)' : TYPES[k]}</option>`).join('')}</select></label>
    <div class="two"><label>Target<input name="targetValue" type="number" inputmode="decimal" min="1" step="any" required value="${esc(g.targetValue ?? '')}"></label>
    <label>Unit<select name="targetUnit">${units.map(u => `<option value="${u}" ${u === g.targetUnit ? 'selected' : ''}>${UNIT_LABEL[u]}</option>`).join('')}</select></label></div>
    <label>Frequency<select name="frequency">${['daily', 'weekly'].map(x => `<option value="${x}" ${x === g.frequency ? 'selected' : ''} ${type === 'any' && x === 'daily' ? 'disabled' : ''}>${x}</option>`).join('')}</select></label>
    <label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="active" style="width:auto;margin:0;min-height:0" ${g.active ? 'checked' : ''}> Active</label>
    <button class="primary full" type="submit">Save goal</button>
    <p class="two"><button type="button" data-act="close">Cancel</button>${g.id ? `<button type="button" class="danger" data-act="del-goal" data-id="${g.id}">Delete</button>` : '<span></span>'}</p></form>`;
}
function openGoal(id) {
  const g = id ? S.goals.find(x => x.id === id) : { activityType: 'cycling', targetValue: 30, targetUnit: 'min', frequency: 'daily', active: true };
  $('#dlg').innerHTML = goalForm(g); $('#dlg').showModal();
}
async function submitGoal(form) {
  const fd = new FormData(form), type = fd.get('activityType'), v = num(fd.get('targetValue'));
  if (!v || v <= 0) return toast('Enter a target');
  await save('goals', { id: form.dataset.id || uid(), activityType: type, targetValue: v, targetUnit: fd.get('targetUnit'), frequency: type === 'any' ? 'weekly' : fd.get('frequency'), active: !!fd.get('active') });
  $('#dlg').close(); toast('Goal saved ✓'); render();
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
    for (const k of ['weights', 'activities', 'goals']) for (const r of d[k] || []) await save(k, r);
    toast('Backup restored ✓'); render();
  } catch { toast('Not a valid Momentum backup'); }
}

// ---------- router + events ----------
function render() {
  const [tab, arg] = (location.hash.slice(1) || 'dashboard').split('/');
  const view = { dashboard: vDash, log: () => vLog(arg), weight: vWeight, history: vHistory }[tab] || vDash;
  $('#view').innerHTML = view();
  document.querySelectorAll('.tabs a').forEach(a => a.classList.toggle('on', a.dataset.tab === (view === vDash ? 'dashboard' : tab)));
  syncLogForm();
  if (tab !== 'weight') editW = null;
}

document.addEventListener('click', async e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const { act, id } = el.dataset;
  if (act === 'type') { const form = $('#logForm'); form.dataset.type = el.dataset.type; syncLogForm(); }
  else if (act === 'goal') openGoal(id);
  else if (act === 'close') $('#dlg').close();
  else if (act === 'del-goal') { if (confirm('Delete this goal?')) { await remove('goals', id); $('#dlg').close(); render(); } }
  else if (act === 'del-act') { if (confirm('Delete this entry? This cannot be undone.')) { await remove('activities', id); toast('Deleted'); location.hash = '#history'; } }
  else if (act === 'edit-w') { editW = id; render(); scrollTo(0, 0); }
  else if (act === 'cancel-w') { editW = null; render(); }
  else if (act === 'del-w') { if (confirm('Delete this weight record?')) { await remove('weights', id); editW = null; render(); } }
  else if (act === 'range') { const d = +el.dataset.d; H.to = ''; H.from = d ? addDays(today(), -(d - 1)) : ''; render(); }
  else if (act === 'export-json') exportJSON();
  else if (act === 'export-csv') exportCSV();
});
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
addEventListener('hashchange', () => { render(); scrollTo(0, 0); });
const setOffline = () => { $('#offline').hidden = navigator.onLine; };
addEventListener('online', setOffline); addEventListener('offline', setOffline);

(async function init() {
  setOffline();
  try { db = await openDB(); await load(); }
  catch { $('#view').innerHTML = '<div class="card">Storage is unavailable in this browser mode, so Momentum cannot save data. Try a normal (non-private) window.</div>'; return; }
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
