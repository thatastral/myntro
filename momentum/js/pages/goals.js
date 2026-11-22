import { esc, compact, pct, fmtShort, plural, money } from '../util.js';
import { chip, icon } from '../icons.js';
import { ring } from '../charts.js';
import { card, tile, head, empty } from '../ui.js';
import { shortTitle } from '../insights.js';
import { areaN } from '../areas.js';

export const filter = { cat: 'All' };
const ORDER = { 'at-risk': 0, overdue: 0, behind: 1, 'on-track': 2, ahead: 2, open: 3, done: 4 };

export function goals(state, A) {
  const cats = ['All', ...new Set(A.goals.map(g => g.category).filter(Boolean))];
  const gs = A.goals.filter(g => filter.cat === 'All' || g.category === filter.cat).sort((a, b) => (ORDER[a.status] - ORDER[b.status]) || a.daysLeft - b.daysLeft);
  const n = k => A.goals.filter(g => k.includes(g.status)).length;
  const fmt = (g, v) => g.currency ? money(v, g.currency) : compact(v);
  const cardOf = g => { const a = areaN(g.category); return `<article class="gcard a${a}">
    <header><span class="cat"><i class="dotc"></i>${esc(g.category || '')}</span>${chip(g.status)}</header>
    <h3>${esc(shortTitle(g.title))}</h3>
    ${g.binary ? `<p class="sub">Milestone · ${g.status === 'done' ? 'achieved' : 'in progress'}</p>`
      : `<div class="gauge-row">${ring(g.pct, 88, `<span class="mini" style="font-size:15px">${Math.round(g.pct * 100)}%</span>`, 10, a)}<div class="g-side"><b>${fmt(g, g.total)}</b><span class="sub">of ${fmt(g, g.target)}</span>${g.status === 'done' ? '' : `<div class="sub" style="margin-top:6px">Expected by now: ${Math.round(g.elapsed * 100)}%</div>`}</div></div>`}
    <footer class="sub"><span>${g.status === 'done' ? 'Completed' : g.daysLeft >= 0 ? `${plural(g.daysLeft, 'day')} left · ${fmtShort(g.deadline || state.cycle.end)}` : 'past deadline'}</span>${g.perDay && !g.binary ? `<span>needs ${fmt(g, g.perDay)}/day</span>` : ''}${g.live ? `<span data-tip="Counted live from your habit ticks, no need to update Current">${icon('bolt', 12)} live</span>` : ''}</footer></article>`; };
  const wg = A.weeklyGoals;
  return `${head('Goals', `${state.cycle.label} · day ${A.cycle.day} of ${A.cycle.total}`)}
    <div class="grid12">
      ${card('s12', 'Overview', `<div class="tiles t4">${tile('Done', `${n(['done'])}<small>/${A.goals.length}</small>`)}${tile('On track', n(['ahead', 'on-track']))}${tile('Behind', n(['behind']))}${tile('At risk', n(['at-risk', 'overdue']))}</div>`)}
      <div class="s12"><div class="chips seg-scroll">${cats.map(c => `<button class="${c === filter.cat ? 'on' : ''}" data-do="goal-cat" data-cat="${esc(c)}">${c !== 'All' ? `<i class="dotc a${areaN(c)}"></i>` : ''}${esc(c)}</button>`).join('')}</div></div>
      <div class="s12"><div class="gcards">${gs.length ? gs.map(cardOf).join('') : empty('No goals in this category.')}</div></div>
      ${card('s12', 'Weekly goals this week', wg.length ? `<ul class="rows">${wg.map(x => `<li class="row-i a${areaN(x.category)}"><span class="ri-ic ${x.status === 'Done' ? 'done' : x.status === 'Missed' ? 'miss' : ''}">${icon(x.status === 'Done' ? 'check' : x.status === 'Missed' ? 'alert' : 'dot', 17)}</span><div><b>${esc(x.title)}</b><span class="sub"><i class="dotc" style="margin-right:6px"></i>${esc(x.category || '')}${x.deadline ? ' · due ' + fmtShort(x.deadline) : ''}${x.doneWhen ? ' · ' + esc(x.doneWhen) : ''}</span></div><span class="sub">${esc(x.status || '')}</span></li>`).join('')}</ul>` : empty('No weekly goals this week.'))}
    </div>`;
}
