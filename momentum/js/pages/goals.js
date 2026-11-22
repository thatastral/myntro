import { esc, compact, pct, fmtShort, plural, money } from '../util.js';
import { chip, icon } from '../icons.js';
import { meter } from '../charts.js';
import { card, tile, head, empty } from '../ui.js';
import { shortTitle } from '../insights.js';

export const filter = { cat: 'All' };

export function goals(state, A) {
  const cats = ['All', ...new Set(A.goals.map(g => g.category).filter(Boolean))];
  const gs = A.goals.filter(g => filter.cat === 'All' || g.category === filter.cat)
    .sort((a, b) => ({ 'at-risk': 0, overdue: 0, behind: 1, 'on-track': 2, ahead: 2, open: 3, done: 4 }[a.status] - { 'at-risk': 0, overdue: 0, behind: 1, 'on-track': 2, ahead: 2, open: 3, done: 4 }[b.status]) || a.daysLeft - b.daysLeft);
  const n = k => A.goals.filter(g => k.includes(g.status)).length;
  const cardOf = g => `<article class="gcard">
    <header><span class="cat">${esc(g.category || '')}</span>${chip(g.status)}</header>
    <h3>${esc(shortTitle(g.title))}</h3>
    ${g.binary ? `<p class="sub">Milestone · ${esc(g.status === 'done' ? 'achieved' : 'in progress')}</p>` : `<div class="g-nums"><b>${g.currency ? money(g.total, g.currency) : compact(g.total)}</b><span class="sub">of ${g.currency ? money(g.target, g.currency) : compact(g.target)}</span><em>${pct(g.pct)}</em></div>${meter(g.pct, { pace: g.elapsed })}`}
    <footer class="sub"><span>${g.status === 'done' ? 'Completed' : g.daysLeft >= 0 ? `${plural(g.daysLeft, 'day')} left · ${fmtShort(g.deadline || state.cycle.end)}` : 'past deadline'}</span>${g.perDay && !g.binary ? `<span>needs ${g.currency ? money(g.perDay, g.currency) : compact(g.perDay)}/day</span>` : ''}${g.live ? `<span data-tip="Counted live from your habit ticks, no need to update Current">${icon('bolt', 12)} live</span>` : ''}</footer></article>`;
  const wg = A.weeklyGoals;
  return `${head('Goals', `${state.cycle.label} · day ${A.cycle.day} of ${A.cycle.total}`)}
    <div class="grid12">
      ${card('s12', 'Overview', `<div class="tiles t4">${tile('Done', `${n(['done'])}<small>/${A.goals.length}</small>`)}${tile('On track', n(['ahead', 'on-track']))}${tile('Behind', n(['behind']))}${tile('At risk', n(['at-risk', 'overdue']))}</div>
        <p class="sub" style="margin-top:12px">The tick on each bar marks where you should be by now (${pct(A.cycle.pct)} of the cycle).</p>`)}
      <div class="s12"><div class="chips seg-scroll">${cats.map(c => `<button class="${c === filter.cat ? 'on' : ''}" data-do="goal-cat" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
      <div class="s12"><div class="gcards">${gs.length ? gs.map(cardOf).join('') : empty('No goals in this category.')}</div></div>
      ${card('s12', 'Weekly goals this week', wg.length ? `<ul class="rows">${wg.map(x => `<li class="row-i"><span class="ri-ic ${x.status === 'Done' ? 'done' : x.status === 'Missed' ? 'miss' : ''}">${icon(x.status === 'Done' ? 'check' : x.status === 'Missed' ? 'alert' : 'dot', 16)}</span><div><b>${esc(x.title)}</b><span class="sub">${esc(x.category || '')}${x.deadline ? ' · due ' + fmtShort(x.deadline) : ''}${x.doneWhen ? ' · ' + esc(x.doneWhen) : ''}</span></div><span class="sub">${esc(x.status || '')}</span></li>`).join('')}</ul>` : empty('No weekly goals this week.'))}
    </div>`;
}
