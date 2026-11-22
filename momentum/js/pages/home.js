// Home = the glance. Summaries and graphics here; detail is one tap away.
import { esc, pct, fmtWeekday, fmtShort, money } from '../util.js';
import { icon, chip } from '../icons.js';
import { miniWeek, rings2, ring, heat } from '../charts.js';
import { habitStrip, empty, more } from '../ui.js';
import { shortTitle } from '../insights.js';
import { areaN, GROUP_ICON } from '../areas.js';
import { addDays } from '../dates.js';

export const ui = { open: new Set(), plan: false, fixes: false, then: false };

const greeting = () => { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; };
const stIcon = s => s === 'Done' ? icon('check', 17) : s === 'Missed' ? icon('alert', 17) : s === 'In progress' ? icon('clock', 17) : icon('dot', 14);
const stCls = s => s === 'Done' ? 'done' : s === 'Missed' ? 'miss' : s === 'In progress' ? 'prog' : '';
const toggle = (key, on, label) => `<button class="tglb ${on ? 'open' : ''}" data-do="toggle" data-key="${key}">${label}${icon('down', 14)}</button>`;

function hero(state, A) {
  const T = A.today, p = Math.round(T.pct * 100);
  const tp = T.tasks.length ? T.tDone / T.tasks.length : 0, hp = T.habitCount ? T.hDone / T.habitCount : 0;
  const list = state.habits?.list ?? [], row = state.habits?.days.find(d => d.date === state.today);
  const qa = [['Hydrate 1.5L', 'Water', 'drop'], ['Workout', 'Workout', 'bolt']].filter(([k]) => row && list.some(h => h.key === k))
    .map(([k, l, ic]) => { const on = !!row.done[k]; return `<button class="a2 ${on ? 'on' : ''}" data-do="tick" data-habit="${esc(k)}" data-date="${state.today}" aria-pressed="${on}"><span class="qi">${icon(on ? 'check' : ic, 24)}</span>${l}</button>`; });
  qa.push(`<a class="a1" href="#/fitness/log"><span class="qi">${icon('plus', 24)}</span>Log session</a>`);
  return `<section class="card hero-today"><div class="rings">${rings2(tp, hp)}<div class="mid"><div class="hero-num">${p}<small>%</small></div><div class="hero-lbl">of today</div></div></div>
    <div><div class="eyebrow">Today</div><div class="legend">
      <div><i class="dotc a1"></i>Tasks <b>${T.tDone} of ${T.tasks.length}</b></div>
      <div><i class="dotc a2"></i>Habits <b>${T.hDone} of ${T.habitCount}</b></div></div>
      <div class="qa">${qa.join('')}</div></div></section>`;
}

function nextCard(A) {
  const T = A.today, a = T.attack;
  if (!T.tasks.length) return `<section class="card"><h2>Up next</h2>${empty('Nothing planned today. Plan it from your weekly goals in Notion.')}</section>`;
  if (!a) return `<section class="card"><div class="allclear">${icon('check', 24)}<div><b>All clear for today</b><p class="sub">Every task is closed out. Finish your habits and rest.</p></div></div></section>`;
  const then = T.next.length ? `${ui.then ? `<div class="then">${T.next.map(n => `<div><span>${esc(n.title)}</span><span class="sub">${esc((n.time || '').split(/[-–]/)[0])}</span></div>`).join('')}</div>` : ''}${toggle('then', ui.then, ui.then ? 'Hide' : `${T.next.length} more after this`)}` : '';
  const tag = a.slot === 'Must Finish' ? 'must' : a.slot === 'Must Advance' ? 'adv' : '';
  return `<section class="card next"><div class="next-top"><span class="label">Up next</span><span class="tag ${tag}">${esc(a.slot || 'Task')}</span></div>
    <h3>${esc(a.title)}</h3><div class="meta">${a.time ? `<span>${icon('clock', 15)}${esc(a.time)}</span>` : ''}${a.doneWhen ? `<span>Done when: ${esc(a.doneWhen)}</span>` : ''}</div>${then}</section>`;
}

const taskRow = t => {
  const open = ui.open.has(t.id);
  return `<li><div class="li task ${stCls(t.status)}" data-do="task" data-id="${esc(t.id)}"><span class="bub ${stCls(t.status)}">${stIcon(t.status)}</span>
    <div><b>${esc(t.title)}</b><span class="sub">${esc(t.time || '')}</span>${open ? `<div class="task-more">${t.doneWhen ? `<p>Done when: ${esc(t.doneWhen)}</p>` : ''}${t.notes ? `<p>${esc(t.notes)}</p>` : ''}<p>Status: ${esc(t.status || 'Not started')}. Update it in Notion.</p></div>` : ''}</div>
    <span class="st-label">${t.status === 'Done' ? '' : esc(t.status || '')}</span></div></li>`;
};

function planCard(A) {
  const T = A.today, openT = T.tasks.filter(t => t.status !== 'Done' && t.status !== 'Missed');
  if (!T.tasks.length) return `<section class="card"><h2>Today's plan</h2>${empty('No tasks for today.')}</section>`;
  const base = openT.length ? openT : T.tasks;
  const body = !ui.plan ? `<ul class="list">${base.slice(0, 4).map(taskRow).join('')}</ul>`
    : ['Must Finish', 'Must Advance', 'Maintenance'].map(s => ({ s, items: T.tasks.filter(t => (t.slot || 'Maintenance') === s) })).filter(g => g.items.length)
      .map(g => `<div class="grp"><h4>${esc(g.s)}</h4><ul class="list">${g.items.map(taskRow).join('')}</ul></div>`).join('');
  return `<section class="card"><h2>Today's plan <span class="h-sub">${T.tDone} of ${T.tasks.length} done</span></h2>${body}
    ${T.tasks.length > 4 ? `<div style="text-align:center">${toggle('plan', ui.plan, ui.plan ? 'Show less' : `Show all ${T.tasks.length}`)}</div>` : ''}</section>`;
}

function weekCard(A) {
  const W = A.weekStats, hp = W.habits[1] ? Math.round(W.habits[0] / W.habits[1] * 100) : 0;
  return `<section class="card a1"><h2>This week</h2><div class="week-top"><div><div class="week-big">${Math.round(W.pct * 100)}<small>%</small></div><div class="sub">complete</div></div>${miniWeek(A.week)}</div>
    <p class="week-line">${W.tasks[0]} of ${W.tasks[1]} tasks · ${hp}% of habits${W.missed ? ` · ${W.missed} missed` : ''}</p></section>`;
}

const stDot = g => ['at-risk', 'overdue'].includes(g.status) ? `<span class="stdot crit">${icon('alert', 12)}At risk</span>`
  : g.status === 'behind' ? `<span class="stdot warn">${icon('clock', 12)}Behind</span>`
  : ['ahead', 'on-track'].includes(g.status) ? `<span class="stdot good">${icon('check', 12)}On track</span>` : '';

function goalsCard(A) {
  const order = { 'at-risk': 0, overdue: 0, behind: 1, 'on-track': 2, ahead: 2, open: 3, done: 4 };
  const gs = A.goals.filter(g => g.status !== 'done' && !g.binary).sort((a, b) => (order[a.status] - order[b.status]) || a.daysLeft - b.daysLeft).slice(0, 6);
  if (!gs.length) return '';
  return `<section class="card"><h2>Goals <span class="h-sub">progress vs. time used</span></h2><div class="gauges">${gs.map(g =>
    `<a class="gauge" href="#/goals">${ring(g.pct, 78, `<span class="mini">${Math.round(g.pct * 100)}%</span>`, 9, areaN(g.category))}<span class="gl2">${esc(shortTitle(g.title))}</span>${stDot(g)}</a>`).join('')}</div>${more('#/goals', 'All goals')}</section>`;
}

function consistencyCard(state, A) {
  const list = state.habits?.list ?? [], days = state.habits?.days ?? [];
  if (!list.length) return '';
  const dates = Array.from({ length: 14 }, (_, i) => addDays(state.today, i - 13));
  const groups = [...new Set(list.map(h => h.group))];
  const rows = groups.map(g => { const hs = list.filter(h => h.group === g);
    return { label: g, icon: GROUP_ICON[g] || 'dot', area: areaN(g), right: '', cells: dates.map(d => { const r = days.find(x => x.date === d); if (!r) return { v: null, tip: '' };
      const k = hs.filter(h => r.done[h.key]).length; return { v: k / hs.length, tip: `${g} · ${fmtShort(d)}: ${k} of ${hs.length}` }; }) }; });
  return `<section class="card"><h2>Consistency <span class="h-sub">last 2 weeks, by area</span></h2>${heat(rows, { cols: 14 })}${more('#/habits', 'All habits')}</section>`;
}

function fixesCard(A) {
  const all = A.fixes, shown = ui.fixes ? all : all.slice(0, 3);
  if (!all.length) return `<section class="card"><div class="allclear">${icon('check', 24)}<div><b>Nothing needs attention</b><p class="sub">No missed tasks, slipping habits or goals behind pace.</p></div></div></section>`;
  return `<section class="card"><h2>Needs attention <span class="count">${all.length}</span></h2>
    <ul class="list">${shown.map(x => `<li><a class="li" href="${x.go}"><span class="bub sev${Math.min(3, x.sev)}">${icon(x.icon, 17)}</span><div><b>${esc(x.title)}</b><span class="sub">${esc(x.detail)}</span></div>${icon('arrow', 15, 'chev')}</a></li>`).join('')}</ul>
    ${all.length > 3 ? `<div style="text-align:center">${toggle('fixes', ui.fixes, ui.fixes ? 'Show less' : `Show all ${all.length}`)}</div>` : ''}</section>`;
}

function overview(state, A, ctx) {
  const rows = [];
  const row = (n, ic, title, summary, right, href) => rows.push(`<li><a class="li a${n}" href="${href}"><span class="tic">${icon(ic, 19)}</span><div><b>${title}</b><span class="sub">${summary}</span></div><span class="rowsum">${right}${icon('arrow', 15, 'chev')}</span></a></li>`);
  const hs = Object.values(A.hs), best = Math.max(0, ...hs.map(s => s.streak)), W = A.weekStats;
  row(4, 'habits', 'Habits', `${W.habits[1] ? pct(W.habits[0] / W.habits[1]) : '0%'} this week${best ? ` · best streak ${best}d` : ''}`, '', '#/habits');
  const g = A.goals, risk = g.filter(x => ['at-risk', 'overdue'].includes(x.status)).length, behind = g.filter(x => x.status === 'behind').length;
  row(6, 'goals', 'Goals', `${g.filter(x => x.status === 'done').length} of ${g.length} done · ${behind} behind`, risk ? chip('at-risk', `${risk} at risk`) : '', '#/goals');
  const mg = g.filter(x => x.category === 'Money' && x.status !== 'done').sort((a, b) => a.daysLeft - b.daysLeft)[0], tm = state.tim?.month;
  row(3, 'money', 'Money', mg ? `${esc(shortTitle(mg.title))} · ${pct(mg.pct)}${mg.daysLeft >= 0 ? `, ${mg.daysLeft}d left` : ''}` : tm ? `${esc(tm.label)}: ${money(tm.spent, state.tim.currency)} of ${money(tm.budget, state.tim.currency)}` : 'Goals and spending', mg && ['at-risk', 'overdue'].includes(mg.status) ? chip('at-risk') : '', '#/money');
  const C = A.career;
  row(5, 'career', 'Career', `${C.active.length} in play · ${C.nextActions.length} follow-ups`, C.nextActions.some(c => c.nextDate < state.today) ? chip('at-risk', 'Overdue') : '', '#/career');
  const fit = ctx.fitness, w = A.hs['Workout'];
  row(2, 'fitness', 'Fitness', `${w ? w.weekDone : 0} workouts this week${fit?.weight != null ? ` · ${Math.round(fit.weight * 10) / 10} kg` : ''}`, '', '#/fitness');
  return `<section class="card"><h2>Overview <span class="h-sub">Day ${A.cycle.day} of ${A.cycle.total}</span></h2><ul class="list">${rows.join('')}</ul></section>`;
}

export function home(state, A, ctx) {
  const errs = state.errors && Object.keys(state.errors).length;
  return `<div class="page-head"><div><div class="eyebrow">${esc(fmtWeekday(state.today))}, ${esc(fmtShort(state.today))}</div><h1>${greeting()}</h1></div></div>
    ${errs ? `<div class="warn-bar">${icon('alert', 16)} Some data couldn't load from Notion (${Object.keys(state.errors).join(', ')}). Showing the last good copy.</div>` : ''}
    <div class="cols">
      <div class="col">${hero(state, A)}${nextCard(A)}<section class="card"><h2>Habits <span class="h-sub">${A.today.hDone} of ${A.today.habitCount} today</span></h2>${habitStrip(state, A)}${more('#/habits', 'All habits')}</section>${planCard(A)}${fixesCard(A)}</div>
      <div class="col">${weekCard(A)}${goalsCard(A)}${consistencyCard(state, A)}${overview(state, A, ctx)}</div>
    </div>`;
}
