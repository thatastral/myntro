import { esc, f, pct, fmtDay, fmtShort, compact, money } from '../util.js';
import { icon, chip } from '../icons.js';
import { ring, meter, weekBars, heat } from '../charts.js';
import { card, tile, empty, more, habitChips, head } from '../ui.js';
import { shortTitle } from '../insights.js';
import { addDays } from '../dates.js';

export const openTasks = new Set(); // which task rows are expanded (kept across live re-renders)

const slotCls = s => ({ 'Must Finish': 'sl-must', 'Must Advance': 'sl-adv', Maintenance: 'sl-main' }[s] || 'sl-main');
const stIcon = s => s === 'Done' ? icon('check', 16) : s === 'Missed' ? icon('alert', 16) : s === 'In progress' ? icon('clock', 16) : icon('dot', 16);
const stCls = s => s === 'Done' ? 'done' : s === 'Missed' ? 'miss' : s === 'In progress' ? 'prog' : '';

function greeting() { const h = new Date().getHours(); return h < 5 ? 'Still up' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'; }

function attackCard(A) {
  const t = A.today.tasks, a = A.today.attack;
  let body;
  if (!t.length) body = empty('Nothing planned for today. Plan it from your weekly goals in Notion.');
  else if (!a) body = `<div class="allclear">${icon('check', 28)}<div><b>All clear.</b><p class="sub">Every task today is closed out. Finish your habits and rest.</p></div></div>`;
  else body = `<div class="attack"><span class="slot ${slotCls(a.slot)}">${esc(a.slot || 'Task')}</span><h3>${esc(a.title)}</h3>
    <p class="sub">${a.time ? `${icon('clock', 14)} ${esc(a.time)}` : ''}${a.doneWhen ? ` · Done when: ${esc(a.doneWhen)}` : ''}</p></div>
    ${A.today.next.length ? `<div class="then"><span class="sub">Then</span>${A.today.next.map(n => `<div><i class="${slotCls(n.slot)}"></i><span>${esc(n.title)}</span><em class="sub">${esc((n.time || '').split(/[-–]/)[0])}</em></div>`).join('')}</div>` : ''}`;
  return card('s7 attack-card', 'Attack first', body);
}

function todayCard(state, A) {
  const T = A.today, p = T.pct;
  const body = `<div class="today-body">${ring(p, 168, `<b class="big">${Math.round(p * 100)}<small>%</small></b><span class="sub">of today</span>`, 14)}
    <ul class="mini-stats">
      <li><span class="sub">Tasks</span><b>${T.tDone}/${T.tasks.length}</b></li>
      <li><span class="sub">Habits</span><b>${T.hDone}/${T.habitCount}</b></li>
      ${T.slots.filter(s => s.total).map(s => `<li><span class="sub"><i class="${slotCls(s.slot)}"></i>${esc(s.slot)}</span><b>${s.done}/${s.total}</b></li>`).join('')}
    </ul></div>`;
  return card('s5', `Today <span class="sub h-sub">${fmtDay(state.today)}</span>`, body);
}

function weekCard(state, A) {
  const W = A.weekStats;
  const body = `<div class="week-wrap">${weekBars(A.week)}
    <div class="tiles">${tile('Tasks done', `${W.tasks[0]}<small>/${W.tasks[1]}</small>`)}${tile('Habit rate', W.habits[1] ? pct(W.habits[0] / W.habits[1]) : '-')}${tile('Weekly goals', `${W.goals[0]}<small>/${W.goals[1]}</small>`)}${tile('Missed', W.missed, W.missed ? 'close them out' : 'clean week')}</div></div>`;
  return card('s7', `This week <span class="sub h-sub">${Math.round(W.pct * 100)}% complete</span>`, body);
}

function weeklyGoalsCard(A) {
  const g = A.weeklyGoals;
  const body = g.length ? `<ul class="rows">${g.map(x => `<li class="row-i"><span class="ri-ic ${stCls(x.status)}">${stIcon(x.status)}</span><div><b>${esc(x.title)}</b><span class="sub">${esc(x.category || '')}${x.priority ? ' · ' + esc(x.priority) : ''}${x.stretch ? ' · stretch' : ''}</span></div><span class="sub">${esc(x.status || '')}</span></li>`).join('')}</ul>` : empty('No weekly goals for this week.');
  return card('s5', 'Weekly goals', body);
}

function tasksCard(A) {
  const T = A.today.tasks;
  const groups = ['Must Finish', 'Must Advance', 'Maintenance'].map(s => ({ s, items: T.filter(t => (t.slot || 'Maintenance') === s) })).filter(g => g.items.length);
  const body = groups.length ? groups.map(g => `<div class="grp"><h4><i class="${slotCls(g.s)}"></i>${esc(g.s)}</h4><ul class="rows">${g.items.map(t => {
    const open = openTasks.has(t.id);
    return `<li class="task ${stCls(t.status)} ${open ? 'open' : ''}" data-do="task" data-id="${esc(t.id)}"><span class="ri-ic ${stCls(t.status)}">${stIcon(t.status)}</span>
      <div><b>${esc(t.title)}</b><span class="sub">${esc(t.time || '')}</span>${open ? `<div class="task-more sub">${t.doneWhen ? `<p>Done when: ${esc(t.doneWhen)}</p>` : ''}${t.notes ? `<p>${esc(t.notes)}</p>` : ''}<p>Status: ${esc(t.status || 'Not started')}. Update it in Notion.</p></div>` : ''}</div>
      <span class="st-label">${esc(t.status || 'Not started')}</span></li>`; }).join('')}</ul></div>`).join('') : empty('No tasks for today.');
  return card('s7', 'Today\'s plan', body);
}

function fixesCard(A) {
  const fx = A.fixes.slice(0, 6);
  const body = fx.length ? `<ul class="rows fixes">${fx.map(x => `<li><a href="${x.go}" class="fix"><span class="ri-ic sev${Math.min(3, x.sev)}">${icon(x.icon, 16)}</span><div><b>${esc(x.title)}</b><span class="sub">${esc(x.detail)}</span></div>${icon('arrow', 14)}</a></li>`).join('')}</ul>`
    : `<div class="allclear">${icon('check', 28)}<div><b>Nothing needs fixing.</b><p class="sub">No missed tasks, slipping habits or goals behind pace.</p></div></div>`;
  return card('s5', `Needs fixing${A.fixes.length ? ` <span class="badge">${A.fixes.length}</span>` : ''}`, body);
}

function heatCard(state, A) {
  const list = state.habits?.list ?? [];
  const rows = list.map(h => ({ label: h.label, icon: h.icon, cells: A.week.map(d => {
    const row = state.habits.days.find(x => x.date === d.date);
    return { v: d.future || !row ? null : row.done[h.key] ? 1 : 0, tip: `${h.label} · ${d.name}: ${d.future ? 'upcoming' : row?.done[h.key] ? 'done' : 'not done'}` };
  }), right: A.hs[h.key].streak ? `<span class="streak">${icon('flame', 13)}${A.hs[h.key].streak}</span>` : '' }));
  return card('s7', 'Habits this week', heat(rows, { cols: 7, labels: A.week.map(d => d.label) }), more('#/habits', 'All habits'));
}

function goalsCard(A) {
  const order = { 'at-risk': 0, overdue: 0, behind: 1, 'on-track': 2, ahead: 2, open: 3, done: 4 };
  const gs = A.goals.filter(g => g.status !== 'done').sort((a, b) => (order[a.status] - order[b.status]) || (a.daysLeft - b.daysLeft)).slice(0, 5);
  const body = gs.length ? `<ul class="rows goals-mini">${gs.map(g => `<li><div class="gm-top"><b>${esc(shortTitle(g.title))}</b>${chip(g.status)}</div>${g.binary ? '' : meter(g.pct, { pace: g.elapsed })}<span class="sub">${g.binary ? 'Milestone' : `${compact(g.total)} / ${compact(g.target)}`} · ${g.daysLeft >= 0 ? `${g.daysLeft}d left` : 'past deadline'}</span></li>`).join('')}</ul>` : empty('No open goals.');
  return card('s7', 'Goals pace', body, more('#/goals', 'All goals'));
}

function moneyCard(state, A) {
  const mg = A.goals.filter(g => g.category === 'Money' && g.status !== 'done').slice(0, 2);
  const tm = state.tim?.month;
  const parts = mg.map(g => `<div class="mm"><div class="gm-top"><b>${esc(shortTitle(g.title))}</b>${chip(g.status)}</div>${meter(g.pct, { pace: g.elapsed })}<span class="sub">${money(g.total, g.currency)} of ${money(g.target, g.currency)}${g.perDay ? ` · needs ${money(g.perDay, g.currency)}/day` : ''}</span></div>`);
  if (tm) parts.push(`<div class="mm"><div class="gm-top"><b>${esc(tm.label)} spending</b>${tm.spent > tm.budget ? chip('at-risk', 'Over budget') : chip('on-track', 'Within budget')}</div>${meter(tm.spent / tm.budget)}<span class="sub">${money(tm.spent, state.tim.currency)} of ${money(tm.budget, state.tim.currency)}</span></div>`);
  return card('s5', 'Money', parts.length ? parts.join('') : empty('No money goals yet.'), more('#/money', 'Money'));
}

function careerCard(A) {
  const C = A.career, na = C.nextActions.slice(0, 3);
  const body = `<div class="cw"><div class="tiles t3">${tile('In play', C.active.length)}${tile('Contacted', C.contactedWeek, 'this week')}${tile('Follow-ups', C.nextActions.length)}</div>
    ${na.length ? `<ul class="rows">${na.map(c => `<li class="row-i"><span class="ri-ic">${icon('career', 16)}</span><div><b>${esc(c.title)}</b><span class="sub">${esc(c.next)}</span></div><span class="sub">${esc(fmtShort(c.nextDate))}</span></li>`).join('')}</ul>` : empty('No follow-ups scheduled.')}</div>`;
  return card('s12 career-wide', 'Career pipeline', body, more('#/career', 'Pipeline'));
}

function fitnessCard(state, A, ctx) {
  const w = A.hs['Workout'], fit = ctx.fitness;
  const parts = [`<div class="tiles t3">${tile('Workouts', w ? `${w.weekDone}` : '-', 'this week')}${tile('Active', fit ? `${f(fit.weekMin, 0)}<small>min</small>` : '-', fit ? `${f(fit.weekKm)} km` : '')}${tile('Weight', fit?.weight != null ? `${f(fit.weight)}<small>kg</small>` : '-', fit?.pct != null ? `${Math.round(fit.pct)}% to target` : 'set in Fitness')}</div>`,
    habitChips(state, A, { keys: ['Workout', 'Hydrate 1.5L'] })];
  return card('s5', 'Fitness', parts.join(''), more('#/fitness', 'Fitness'));
}

export function home(state, A, ctx) {
  const c = A.cycle;
  const sub = `Day ${c.day} of ${c.total} · ${c.left} days left in ${esc(state.cycle.label)}`;
  return `${head(greeting(), sub, `<div class="cycle" data-tip="${Math.round(c.pct * 100)}% of the cycle elapsed">${meter(c.pct)}</div>`)}
    ${state.errors && Object.keys(state.errors).length ? `<div class="warn-bar">${icon('alert', 16)} Some data couldn't load from Notion (${Object.keys(state.errors).join(', ')}). Showing the last good copy.</div>` : ''}
    <div class="grid12">${todayCard(state, A)}${attackCard(A)}
      ${card('s12 habits-today', 'Habits today', habitChips(state, A), `<span class="sub">${A.today.hDone} of ${A.today.habitCount} done</span>`)}
      ${weekCard(state, A)}${weeklyGoalsCard(A)}${tasksCard(A)}${fixesCard(A)}${heatCard(state, A)}${fitnessCard(state, A, ctx)}${goalsCard(A)}${moneyCard(state, A)}${careerCard(A)}</div>`;
}
void addDays;
