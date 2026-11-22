// Synthetic, Notion-API-shaped demo data (NOT real personal data).
// Used when MOMENTUM_SOURCE=fixture so the UI can be developed and demoed offline.
import { config } from './config.js';
import { todayIn, addDays, weekStart } from '../../js/dates.js';

const P = {
  title: t => ({ type: 'title', title: [{ plain_text: t }] }),
  text: t => ({ type: 'rich_text', rich_text: t ? [{ plain_text: t }] : [] }),
  check: b => ({ type: 'checkbox', checkbox: !!b }),
  sel: n => ({ type: 'select', select: n ? { name: n } : null }),
  num: n => ({ type: 'number', number: n }),
  date: d => ({ type: 'date', date: d ? { start: d, end: null } : null }),
  rollup: n => ({ type: 'rollup', rollup: { type: 'number', number: n, function: 'sum' } }),
};
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const HABIT_RATE = {
  'Morning devotional': .72, 'Workout': .45, 'Hydrate 1.5L': .6, 'Reading': .66, 'Read an article': .4,
  'Building taste': .35, 'Listen to podcasts': .3, 'Journal': .5, 'Plan tomorrow': .55, 'Work on side project': .78,
};

function build() {
  const tz = config.tz, today = todayIn(tz), ws = weekStart(today), rand = rng(7);
  const db = { habits: [], todos: [], weeklyGoals: [], goals: [], money: [], career: [] };
  let n = 0; const id = k => `${k}-${++n}`;

  // Habits: one row per day, like the real database.
  const first = addDays(today, -56 + 0);
  for (let d = first; d <= addDays(today, 14); d = addDays(d, 1)) {
    const props = { Day: P.title(d), Date: P.date(d) };
    for (const [h, rate] of Object.entries(HABIT_RATE)) {
      let v = false;
      if (d < today) v = rand() < rate * (d > addDays(today, -14) ? 1 : 0.9);
      if (d === today) v = h === 'Morning devotional' || h === 'Work on side project';
      props[h] = P.check(v);
    }
    db.habits.push({ id: id('habit'), properties: props });
  }

  // Daily to-dos for last week + this week.
  const tpl = [
    ['Outreach: send 3 pitches', 'Must Finish', '20:00-21:00'], ['Applications: submit 2', 'Must Finish', '18:30-20:00'],
    ['Deep work block: portfolio piece', 'Must Advance', '07:20-08:50'], ['Workout + devotion', 'Maintenance', '06:00-07:00'],
    ['Reading: 20-minute session', 'Maintenance', '07:00-07:20'], ['Course: study block', 'Must Advance', '21:00-22:00'],
    ['Content: draft the week\'s posts', 'Must Finish', '17:15-18:15'],
  ];
  for (let d = addDays(ws, -7); d <= addDays(ws, 6); d = addDays(d, 1)) {
    const dow = ['1 Monday', '2 Tuesday', '3 Wednesday', '4 Thursday', '5 Friday', '6 Saturday', '7 Sunday'][(new Date(d + 'T00:00:00Z').getUTCDay() + 6) % 7];
    tpl.forEach(([t, slot, time], i) => {
      if ((d.slice(-1) + i) % 5 === 4) return; // vary the days a little
      let status = 'Not started';
      if (d < today) status = rand() < 0.72 ? 'Done' : rand() < 0.6 ? 'Missed' : 'Not started';
      if (d === today) status = i % 3 === 0 ? 'Done' : i === 2 ? 'In progress' : 'Not started';
      db.todos.push({ id: id('todo'), properties: {
        Task: P.title(t), Status: P.sel(status), Slot: P.sel(slot), Date: P.date(d), Day: P.sel(dow),
        Time: P.text(time), 'Done when': P.text(i % 2 ? 'Submitted and logged' : ''), Notes: P.text(''),
      } });
    });
  }

  const wk = (title, cat, pri, status, stretch = false) => db.weeklyGoals.push({ id: id('wg'), properties: {
    'Goal/outcome': P.title(title), Category: P.sel(cat), Priority: P.sel(pri), Status: P.sel(status),
    'Start date': P.date(ws), 'End date': P.date(addDays(ws, 6)), Deadline: P.date(addDays(ws, 6)),
    'Stretch challenge': P.check(stretch), 'Done when': P.text(''), Notes: P.text(''), Slot: P.sel(null), 'Time block': P.sel(null),
  } });
  wk('Send 15 personalised pitches', 'Career', 'High', 'In progress');
  wk('Ship one portfolio deliverable', 'Career', 'High', 'Not started');
  wk('Complete 4 workouts', 'Health', 'Medium', 'In progress');
  wk('Finish a third of the current book', 'Learning', 'Medium', 'In progress');
  wk('Publish 3 posts', 'Personal Brand', 'Medium', 'Done');
  wk('Attend church + youth meeting', 'Faith', 'Medium', 'Not started');
  wk('Close the revenue gap by $500', 'Money', 'High', 'Missed', true);

  const goal = (title, cat, status, pri, cur, target, deadline, logged = null) => { const gid = id('goal');
    db.goals.push({ id: gid, properties: { Goal: P.title(title), Category: P.sel(cat), Status: P.sel(status), Priority: P.sel(pri),
      Current: P.num(cur), Target: P.num(target), 'Logged (Money)': P.rollup(logged), Deadline: P.date(deadline), Notes: P.text('') } });
    return gid; };
  const gRev = goal('Extra revenue: $6,000 (USD)', 'Money', 'In progress', 'High', 0, 6000, cfgEnd(), 1850);
  const gEmg = goal('Emergency fund: $3,000 (USD)', 'Money', 'Done', 'High', 3000, 3000, addDays(today, -10), 0);
  const gNgn = goal('Holiday fund (NGN)', 'Money', 'In progress', 'High', 11000, 500000, addDays(today, 8), 96000);
  goal('Workouts completed (52)', 'Health', 'In progress', 'Medium', 6, 52, cfgEnd());
  goal('Read 4 books this year', 'Learning', 'In progress', 'Medium', 2, 4, cfgEnd());
  goal('Posts published (39)', 'Personal Brand', 'In progress', 'Medium', 9, 39, cfgEnd());
  goal('Devotional days completed (89)', 'Faith', 'In progress', 'Medium', 31, 89, cfgEnd());
  goal('Church Sundays attended (13)', 'Faith', 'In progress', 'Medium', 5, 13, cfgEnd());
  goal('Land a full-time design engineering role', 'Career', 'Not started', 'High', 0, 1, cfgEnd());
  function cfgEnd() { return config.cycle.end; }

  const m = (desc, type, cur, amt, daysAgo, gid, status = 'Received') => db.money.push({ id: id('money'), properties: {
    Description: P.title(desc), Type: P.sel(type), Currency: P.sel(cur), Amount: P.num(amt), Status: P.sel(status),
    Date: P.date(addDays(today, -daysAgo)), Goal: { type: 'relation', relation: [{ id: gid }] } } });
  m('Landing page project', 'Revenue', 'USD', 600, 38, gRev); m('Design sprint retainer', 'Revenue', 'USD', 750, 24, gRev);
  m('Logo + brand kit', 'Revenue', 'USD', 500, 9, gRev); m('Consulting call', 'Revenue', 'USD', 300, 3, gRev, 'Pending');
  m('Weekly transfer', 'Holiday fund', 'NGN', 30000, 30, gNgn); m('Weekly transfer', 'Holiday fund', 'NGN', 30000, 16, gNgn);
  m('Bonus saved', 'Holiday fund', 'NGN', 36000, 5, gNgn); m('Final top-up', 'Emergency fund', 'USD', 400, 21, gEmg);

  const c = (name, type, stage, role, value, next, nextDays, contactedDays) => db.career.push({ id: id('career'), properties: {
    'Company/person': P.title(name), 'Opportunity type': P.sel(type), Stage: P.sel(stage), 'Role/service': P.text(role),
    Value: P.num(value), 'Next action': P.text(next), 'Next action date': P.date(nextDays == null ? null : addDays(today, nextDays)),
    'Date contacted': P.date(contactedDays == null ? null : addDays(today, -contactedDays)), Notes: P.text('') } });
  c('Northwind Labs', 'Job', 'Interview/Call', 'Design Engineer', 4000, 'Prepare case study walkthrough', 2, 12);
  c('Acme Studio', 'Job', 'Proposal/Application', 'Product Designer', 3500, 'Follow up on application', -1, 6);
  c('Helio', 'Job', 'Contacted', 'Design Engineer', 3000, 'Send portfolio', 1, 4);
  c('Brightside', 'Outsets', 'Conversation', 'Brand sprint', 2500, 'Send proposal', 0, 3);
  c('Kite Finance', 'Outsets', 'Proposal/Application', 'Landing redesign', 1800, 'Chase reply', -3, 8);
  c('Orbit', 'Outsets', 'Contacted', 'Design audit', 900, 'Follow up', 3, 2);
  c('Lumen', 'Outsets', 'Lead', 'Product design', 1200, 'Draft pitch', 4, null);
  c('Ember', 'Outsets', 'Won', 'Brand kit', 500, null, null, 20);
  c('Hack Week', 'Hackathon', 'Proposal/Application', 'Submission', null, 'Submit entry', 5, 5);
  c('Global Fellowship', 'Scholarship', 'Lead', 'Masters funding', null, 'Read requirements', 6, null);
  return db;
}

let DB = null;
const data = () => (DB ||= build());

const SCHEMA_HABITS = () => ({ properties: Object.fromEntries([
  ['Day', 'title'], ['Date', 'date'], ['Week', 'select'], ...Object.keys(HABIT_RATE).map(h => [h, 'checkbox']),
].map(([name, type]) => [name, { name, type }])) });

function matches(page, filter) {
  if (!filter) return true;
  if (filter.and) return filter.and.every(f => matches(page, f));
  if (filter.or) return filter.or.some(f => matches(page, f));
  const prop = page.properties[filter.property];
  if (filter.date) {
    const d = prop?.date?.start?.slice(0, 10); if (!d) return false;
    const f = filter.date;
    return (f.equals == null || d === f.equals) && (f.on_or_after == null || d >= f.on_or_after) && (f.on_or_before == null || d <= f.on_or_before);
  }
  return true;
}

export const fixtureStore = {
  async queryAll(key, { filter } = {}) { return data()[key].filter(p => matches(p, filter)); },
  async schema(key) { if (key === 'habits') return SCHEMA_HABITS(); return { properties: {} }; },
  async updatePage(pageId, properties) {
    for (const rows of Object.values(data())) {
      const page = rows.find(r => r.id === pageId);
      if (page) { for (const [k, v] of Object.entries(properties)) if (v.checkbox !== undefined) page.properties[k] = P.check(v.checkbox); return page; }
    }
    throw Object.assign(new Error('page not found'), { status: 404 });
  },
};

export function demoTim() {
  const today = todayIn(config.tz);
  return {
    currency: 'NGN',
    month: { label: new Date(today + 'T00:00:00Z').toLocaleString('en-US', { month: 'long', timeZone: 'UTC' }), budget: 350000, spent: 212400,
      categories: [
        { name: 'Food', budget: 90000, spent: 61000 }, { name: 'Transport', budget: 50000, spent: 38200 },
        { name: 'Data & airtime', budget: 30000, spent: 24500 }, { name: 'Subscriptions', budget: 40000, spent: 41800 },
        { name: 'Personal', budget: 60000, spent: 22900 }, { name: 'Giving', budget: 40000, spent: 24000 },
      ] },
    savings: [{ name: 'Emergency fund', saved: 3000, target: 3000, currency: 'USD' }],
    recent: [
      { date: addDays(today, -1), name: 'Groceries', amount: -12400, category: 'Food' },
      { date: addDays(today, -2), name: 'Ride share', amount: -3800, category: 'Transport' },
      { date: addDays(today, -3), name: 'Music subscription', amount: -4500, category: 'Subscriptions' },
    ],
    updatedAt: new Date().toISOString(),
  };
}
