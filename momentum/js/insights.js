// Pure functions: Notion state in, insight out. No DOM, no network.
import { addDays, diffDays, weekStart, dayLabel } from './dates.js';
import { clamp } from './util.js';

const SLOT_RANK = { 'Must Finish': 0, 'Must Advance': 1, Maintenance: 2 };
const OPEN = s => s !== 'Done' && s !== 'Missed';
const startMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? +m[1] * 60 + +m[2] : 9999; };
export const byPlan = (a, b) => (SLOT_RANK[a.slot] ?? 3) - (SLOT_RANK[b.slot] ?? 3) || startMin(a.time) - startMin(b.time);

export function habitStats(state) {
  const { list = [], days = [] } = state.habits || {};
  const today = state.today, by = new Map(days.map(d => [d.date, d]));
  const out = {};
  for (const h of list) {
    const done = d => !!by.get(d)?.done[h.key];
    const has = d => by.has(d);
    // Today still pending shouldn't break a streak or drag a rate down mid-day.
    const end = done(today) ? today : addDays(today, -1);
    let streak = 0;
    for (let d = end; has(d) && done(d); d = addDays(d, -1)) streak++;
    let best = 0, run = 0;
    for (const d of days) { if (d.date > today) break; run = d.done[h.key] ? run + 1 : 0; best = Math.max(best, run); }
    const rate = (from, n) => { let k = 0, t = 0; for (let i = 0; i < n; i++) { const d = addDays(from, -i); if (!has(d)) continue; t++; if (done(d)) k++; } return t ? k / t : 0; };
    const rate7 = rate(end, 7), ratePrev7 = rate(addDays(end, -7), 7), rate30 = rate(end, 30);
    let since = null;
    for (let i = 0; i < 90; i++) { const d = addDays(today, -i); if (!has(d)) break; if (done(d)) { since = i; break; } }
    const weekDone = days.filter(d => d.date >= state.weekStart && d.date <= today && d.done[h.key]).length;
    const spark = Array.from({ length: 28 }, (_, i) => { const d = addDays(today, i - 27); return has(d) ? (done(d) ? 1 : 0) : null; });
    out[h.key] = { streak, best, rate7, ratePrev7, rate30, since, weekDone, spark, doneToday: done(today) };
  }
  return out;
}

export function dayScore(state, date) {
  if (date > state.today) return { pct: null, tasks: [0, 0], habits: [0, 0] };
  const list = state.habits?.list ?? [];
  const row = (state.habits?.days ?? []).find(d => d.date === date);
  const hd = row ? list.filter(h => row.done[h.key]).length : 0;
  const ts = (state.todos ?? []).filter(t => t.date === date);
  const td = ts.filter(t => t.status === 'Done').length;
  const parts = [];
  if (list.length && row) parts.push(hd / list.length);
  if (ts.length) parts.push(td / ts.length);
  return { pct: parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0, tasks: [td, ts.length], habits: [hd, list.length] };
}

export function goalPace(state, g, hs) {
  const cs = state.cycle.start, ce = state.cycle.end, today = state.today;
  const link = (state.links || []).find(l => g.title?.toLowerCase().includes(l.match));
  const live = link && hs?.[link.habit] ? (state.habits.days.filter(d => d.date >= cs && d.date <= today && d.done[link.habit]).length) : 0;
  const base = Math.max(g.current || 0, live);
  const total = base + (g.logged || 0);
  const target = g.target || 0;
  const pct = target ? clamp(total / target) : 0;
  const dl = g.deadline || ce;
  const span = Math.max(1, diffDays(dl, cs));
  const elapsed = clamp(diffDays(today, cs) / span);
  const daysLeft = diffDays(dl, today);
  const binary = target <= 1;
  let status;
  if (g.status === 'Done' || pct >= 1) status = 'done';
  else if (daysLeft < 0) status = 'overdue';
  else if (binary) status = 'open';
  else {
    const gap = pct - elapsed;
    status = daysLeft <= 10 && pct < 0.8 ? 'at-risk' : gap >= 0.05 ? 'ahead' : gap > -0.1 ? 'on-track' : gap > -0.25 ? 'behind' : 'at-risk';
  }
  const cur = /\b(USD|NGN|GBP|EUR)\b/.exec(g.title || '')?.[1] || null;
  return { ...g, total, live: live > (g.current || 0), pct, elapsed, daysLeft, status, binary, currency: cur,
    perDay: target > total && daysLeft > 0 ? (target - total) / daysLeft : 0, remaining: Math.max(0, target - total) };
}

export function analyze(state, now = new Date()) {
  const today = state.today, ws = state.weekStart, we = addDays(ws, 6);
  const hs = habitStats(state);
  const list = state.habits?.list ?? [];
  const hrow = d => (state.habits?.days ?? []).find(x => x.date === d);
  const todos = state.todos ?? [];

  // ---- today
  const todayTasks = todos.filter(t => t.date === today).sort(byPlan);
  const tDone = todayTasks.filter(t => t.status === 'Done').length;
  const row = hrow(today);
  const hDone = row ? list.filter(h => row.done[h.key]).length : 0;
  const totalToday = todayTasks.length + list.length;
  const todayPct = totalToday ? (tDone + hDone) / totalToday : 0;
  const open = todayTasks.filter(t => OPEN(t.status));
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const attack = open[0] || null;
  const next = open.slice(1, 3);
  const slots = ['Must Finish', 'Must Advance', 'Maintenance'].map(s => {
    const ts = todayTasks.filter(t => t.slot === s);
    return { slot: s, done: ts.filter(t => t.status === 'Done').length, total: ts.length };
  });

  // ---- week
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(ws, i); const s = dayScore(state, date);
    return { date, label: dayLabel(date)[0], name: dayLabel(date), isToday: date === today, future: date > today, ...s };
  });
  const wTasks = todos.filter(t => t.date >= ws && t.date <= we);
  const wDone = wTasks.filter(t => t.status === 'Done').length;
  const wMissed = wTasks.filter(t => t.status === 'Missed').length;
  const elapsedDays = Math.min(7, diffDays(today, ws) + 1);
  const wHabitDone = week.reduce((a, d) => a + (d.future ? 0 : d.habits[0]), 0);
  const wHabitTotal = elapsedDays * list.length;
  const weeklyGoals = (state.weeklyGoals ?? []).filter(g => {
    const s = g.start || g.deadline || g.end, e = g.end || g.deadline || g.start;
    return s && e && s <= we && e >= ws;
  });
  const wgDone = weeklyGoals.filter(g => g.status === 'Done').length;
  const weekPct = (() => { const v = week.filter(d => d.pct != null); return v.length ? v.reduce((a, d) => a + d.pct, 0) / v.length : 0; })();

  // ---- goals
  const goals = (state.goals ?? []).map(g => goalPace(state, g, hs));

  // ---- cycle
  const total = diffDays(state.cycle.end, state.cycle.start) + 1;
  const day = clamp(diffDays(today, state.cycle.start) + 1, 0, total);
  const cycle = { day, total, pct: day / total, left: Math.max(0, total - day) };

  // ---- career
  const career = state.career ?? [];
  const active = career.filter(c => c.stage && !['Won', 'Lost'].includes(c.stage));
  const stages = ['Lead', 'Contacted', 'Follow-up', 'Conversation', 'Proposal/Application', 'Interview/Call', 'Negotiation', 'Won'];
  const stageCounts = stages.map(s => ({ stage: s, n: career.filter(c => c.stage === s).length }));
  const nextActions = career.filter(c => c.next && c.nextDate && !['Won', 'Lost'].includes(c.stage)).sort((a, b) => a.nextDate.localeCompare(b.nextDate));
  const contactedWeek = career.filter(c => c.contacted && c.contacted >= ws && c.contacted <= we).length;

  // ---- needs fixing (most urgent first)
  const fixes = [];
  const overdueOpen = todos.filter(t => t.date < today && OPEN(t.status));
  if (wMissed) fixes.push({ sev: 2, icon: 'alert', title: `${wMissed} task${wMissed > 1 ? 's' : ''} missed this week`, detail: 'Pick one action for each; don\'t carry everything forward.', go: '#/' });
  if (overdueOpen.length) fixes.push({ sev: 1, icon: 'clock', title: `${overdueOpen.length} past task${overdueOpen.length > 1 ? 's' : ''} not closed out`, detail: 'Mark them Done or Missed in Notion.', go: '#/' });
  for (const g of goals) {
    if (g.status === 'at-risk' || g.status === 'overdue') fixes.push({ sev: 3, icon: 'target', title: `${shortTitle(g.title)} is ${g.status === 'overdue' ? 'overdue' : 'at risk'}`, detail: g.binary ? 'Past its deadline.' : `${Math.round(g.pct * 100)}% done, ${Math.round(g.elapsed * 100)}% of the time used.`, go: g.category === 'Money' ? '#/money' : '#/goals' });
    else if (g.status === 'behind') fixes.push({ sev: 1, icon: 'target', title: `${shortTitle(g.title)} is behind pace`, detail: `${Math.round(g.pct * 100)}% done, ${Math.round(g.elapsed * 100)}% of the time used.`, go: g.category === 'Money' ? '#/money' : '#/goals' });
  }
  for (const h of list) {
    const s = hs[h.key];
    if (s.since != null && s.since >= 3 && s.best >= 2) fixes.push({ sev: 1, icon: h.icon, title: `${h.label}: not done in ${s.since} days`, detail: `Best streak was ${s.best}.`, go: '#/habits' });
    else if (s.since == null && s.rate30 === 0 && h.writable === false) continue;
  }
  for (const c of nextActions.filter(c => c.nextDate < today)) fixes.push({ sev: 2, icon: 'career', title: `Follow up: ${c.title}`, detail: `${c.next} (due ${diffDays(today, c.nextDate)}d ago)`, go: '#/career' });
  fixes.sort((a, b) => b.sev - a.sev);

  return { hs, today: { tasks: todayTasks, tDone, hDone, pct: todayPct, attack, next, slots, habitCount: list.length, nowMin },
    week, weekStats: { tasks: [wDone, wTasks.length], missed: wMissed, habits: [wHabitDone, wHabitTotal], goals: [wgDone, weeklyGoals.length], pct: weekPct },
    weeklyGoals, goals, cycle, career: { active, stageCounts, nextActions, contactedWeek }, fixes };
}

export const shortTitle = t => (t || '').replace(/\s*\(.*?\)\s*/g, ' ').replace(/^(Extra revenue|Emergency fund|Workouts completed):?/i, m => m).trim().slice(0, 48);
