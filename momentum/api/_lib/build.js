import { createHash } from 'node:crypto';
import { config } from './config.js';
import { notion, val } from './notion.js';
import { fixtureStore, demoTim } from './fixtures.js';
import { fetchTim } from './tim.js';
import { todayIn, addDays, weekStart } from '../../js/dates.js';
import { httpError } from './http.js';

const isFixture = () => process.env.MOMENTUM_SOURCE === 'fixture';
const store = () => (isFixture() ? fixtureStore : notion);
const TTL = 4000;           // how long one Notion read is shared by every device
const SCHEMA_TTL = 600_000; // habit columns rarely change

let cache = null;           // { state, at }
let inflight = null;
let schemaCache = { at: 0, habits: null };
const overlays = new Map(); // `${date}|${habit}` -> { value, until }: just-written ticks win briefly

const d10 = v => (v ? String(v).slice(0, 10) : null);

export function pick(page, map) {
  const o = { id: page.id };
  for (const [k, name] of Object.entries(map)) o[k] = val(page.properties?.[name]);
  return o;
}

export function habitList(schema) {
  const boxes = Object.values(schema.properties).filter(p => p.type === 'checkbox').map(p => p.name);
  const ordered = [...config.habitOrder.filter(h => boxes.includes(h)), ...boxes.filter(h => !config.habitOrder.includes(h))];
  return ordered.map(key => ({
    key,
    label: config.habitMeta[key]?.label || key,
    icon: config.habitMeta[key]?.icon || 'dot',
    group: config.habitMeta[key]?.group || 'Habits',
    writable: config.writableHabits.includes(key),
  }));
}

export function normalizeHabits(pages, habits) {
  const p = config.props.habits;
  return pages.map(pg => {
    const date = d10(val(pg.properties[p.date]));
    const done = {};
    for (const h of habits) done[h.key] = !!val(pg.properties[h.key]);
    return { id: pg.id, date, done };
  }).filter(r => r.date).sort((a, b) => a.date.localeCompare(b.date));
}

export const normalizeTodos = pages => pages.map(pg => pick(pg, config.props.todos))
  .map(t => ({ ...t, date: d10(t.date) })).filter(t => t.date);
export const normalizeWeeklyGoals = pages => pages.map(pg => pick(pg, config.props.weeklyGoals))
  .map(g => ({ ...g, start: d10(g.start), end: d10(g.end), deadline: d10(g.deadline) }));
export const normalizeGoals = pages => pages.map(pg => pick(pg, config.props.goals))
  .map(g => ({ ...g, deadline: d10(g.deadline), current: g.current ?? 0, logged: g.logged ?? 0 }));
export const normalizeMoney = pages => pages.map(pg => pick(pg, config.props.money))
  .map(m => ({ ...m, date: d10(m.date), amount: m.amount ?? 0 }));
export const normalizeCareer = pages => pages.map(pg => pick(pg, config.props.career))
  .map(c => ({ ...c, nextDate: d10(c.nextDate), contacted: d10(c.contacted) }));

const dateRange = (prop, from, to) => ({ and: [
  { property: prop, date: { on_or_after: from } }, { property: prop, date: { on_or_before: to } },
] });

async function habitSchema() {
  if (schemaCache.habits && Date.now() - schemaCache.at < SCHEMA_TTL) return schemaCache.habits;
  schemaCache = { at: Date.now(), habits: await store().schema('habits') };
  return schemaCache.habits;
}

function applyOverlays(days) {
  const now = Date.now();
  for (const [k, o] of overlays) {
    if (o.until < now) { overlays.delete(k); continue; }
    const [date, habit] = k.split('|');
    const day = days.find(d => d.date === date);
    if (day) day.done[habit] = o.value;
  }
}

const hash = s => createHash('sha1').update(JSON.stringify(s)).digest('hex').slice(0, 10);

async function refresh() {
  const tz = config.tz, today = todayIn(tz), ws = weekStart(today);
  const s = store();
  const from = config.cycle.start > addDays(today, -120) ? config.cycle.start : addDays(today, -120);
  const jobs = {
    habits: async () => {
      const schema = await habitSchema();
      const habits = habitList(schema);
      const pages = await s.queryAll('habits', { filter: dateRange(config.props.habits.date, from, addDays(today, config.habitFutureDays)) });
      return { list: habits, days: normalizeHabits(pages, habits) };
    },
    todos: async () => normalizeTodos(await s.queryAll('todos', { filter: dateRange(config.props.todos.date, addDays(ws, -14), addDays(ws, 13)) })),
    weeklyGoals: async () => normalizeWeeklyGoals(await s.queryAll('weeklyGoals', { max: 200 })),
    goals: async () => normalizeGoals(await s.queryAll('goals')),
    money: async () => normalizeMoney(await s.queryAll('money')),
    career: async () => normalizeCareer(await s.queryAll('career')),
    tim: async () => (isFixture() ? demoTim() : fetchTim()),
  };
  const keys = Object.keys(jobs);
  const settled = await Promise.allSettled(keys.map(k => jobs[k]()));
  const prev = cache?.state;
  const errors = {};
  const state = { tz, today, weekStart: ws, cycle: config.cycle, links: config.goalLinks, demo: isFixture() };
  settled.forEach((r, i) => {
    const k = keys[i];
    if (r.status === 'fulfilled') state[k] = r.value;
    else { errors[k] = String(r.reason?.message || r.reason); state[k] = prev?.[k] ?? null; }
  });
  if (settled.every(r => r.status === 'rejected')) throw httpError(502, Object.values(errors)[0]);
  if (state.habits) applyOverlays(state.habits.days);
  state.errors = errors;
  state.version = hash(state);
  state.generatedAt = new Date().toISOString();
  return state;
}

export async function getState({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < TTL) return cache.state;
  if (!inflight) inflight = refresh().then(state => { cache = { state, at: Date.now() }; return state; }).finally(() => { inflight = null; });
  return inflight;
}

// Write ONE whitelisted habit checkbox back to Notion.
export async function tickHabit({ habit, date, value }) {
  if (!config.writableHabits.includes(habit)) throw httpError(403, `"${habit}" is read-only`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw httpError(400, 'bad date');
  const s = store();
  const rows = await s.queryAll('habits', { filter: { property: config.props.habits.date, date: { equals: date } } });
  if (!rows.length) throw httpError(404, `No habit row for ${date} in Notion`);
  await s.updatePage(rows[0].id, { [habit]: { checkbox: !!value } });
  overlays.set(`${date}|${habit}`, { value: !!value, until: Date.now() + 8000 });
  if (cache?.state?.habits) {
    const day = cache.state.habits.days.find(d => d.date === date);
    if (day) { day.done[habit] = !!value; cache.state.version = hash({ ...cache.state, version: undefined, generatedAt: undefined }); }
  }
  cache && (cache.at = 0); // next read goes back to Notion
  return { ok: true };
}

export const _test = { reset() { cache = null; inflight = null; overlays.clear(); schemaCache = { at: 0, habits: null }; } };
