// Money, Copilot-style: spending ring with spent + budget on either side, then category rows
// (colour dot, spent, status bar, budget) that open to that category's transactions.
import { esc, compact, pct, money, moneyFull, fmtShort, fmtDay, plural } from '../util.js';
import { chip, icon } from '../icons.js';
import { lineChart, donut } from '../charts.js';
import { head, empty, sets } from '../ui.js';
import { shortTitle } from '../insights.js';
import { colorFor } from '../areas.js';

const barState = (spent, budget) => (spent > budget ? 'crit' : spent >= budget * 0.85 ? 'warn' : 'good');

function spending(state) {
  const t = state.tim;
  if (!t) return `<section class="card a3"><h2>Spending</h2><div class="connect">${icon('money', 28)}<div><b>Connect Tim to see spending vs budget here.</b>
    <p class="sub">Set <code>TIM_URL</code> and <code>TIM_TOKEN</code> in Vercel. Momentum reads <code>GET /api/momentum</code> from Tim (this month's budget and spend by category, savings, recent transactions). See SETUP.md for the exact shape.</p></div></div></section>`;
  if (t.error) return `<section class="card"><div class="warn-bar" style="margin:0">${icon('alert', 16)} Couldn't reach Tim: ${esc(t.error)}</div></section>`;
  const m = t.month, cur = t.currency, left = m.budget - m.spent, p = m.budget ? m.spent / m.budget : 0;
  const dim = new Date(Date.UTC(+state.today.slice(0, 4), +state.today.slice(5, 7), 0)).getUTCDate(), dom = +state.today.slice(8), daysLeft = dim - dom + 1;
  const cats = [...m.categories].sort((a, b) => b.spent - a.spent);
  const segs = cats.map(c => ({ value: c.spent, color: colorFor(c.name), tip: `${c.name}: ${moneyFull(c.spent, cur)}` }));
  const recent = t.recent || [];
  const rows = cats.map(c => {
    const open = sets.cats.has(c.name), st = barState(c.spent, c.budget), tx = recent.filter(r => r.category === c.name);
    const detail = open ? `<div class="cat-detail"><div class="tiles t3"><div class="tile"><span class="sub">Spent</span><b>${money(c.spent, cur)}</b></div><div class="tile"><span class="sub">Budget</span><b>${money(c.budget, cur)}</b></div><div class="tile"><span class="sub">${c.spent > c.budget ? 'Over by' : 'Left'}</span><b>${money(Math.abs(c.budget - c.spent), cur)}</b></div></div>
      ${tx.length ? tx.map(r => `<div class="crow"><div><b>${esc(r.name)}</b><span class="sub" style="display:block">${esc(fmtDay(r.date))}</span></div><span class="amt">${money(r.amount, cur)}</span></div>`).join('') : '<p class="sub" style="margin:0">No recent transactions in this category.</p>'}</div>` : '';
    return `<div class="cat-row" style="--a:${colorFor(c.name)}" data-do="mcat" data-name="${esc(c.name)}" role="button" aria-expanded="${open}">
      <span class="cdot"></span><span class="cname">${esc(c.name)}</span><span class="cspent">${money(c.spent, cur)}<span class="cof"> of ${money(c.budget, cur)}</span></span>
      <div class="cbar ${st}" data-tip="${esc(`${c.name}: ${pct(c.budget ? c.spent / c.budget : 0)} of budget`)}"><i style="width:${Math.min(100, (c.budget ? c.spent / c.budget : 0) * 100).toFixed(1)}%"></i></div>
      <span class="cbud">${st === 'crit' ? `<span class="st-crit-t">${icon('alert', 12)} </span>` : ''}${money(c.budget, cur)}</span></div>${detail}`;
  }).join('');
  const byDate = {}; recent.forEach(r => (byDate[r.date] ||= []).push(r));
  return `<section class="card a3"><div class="cop-top"><div class="cop-fig"><b>${money(m.spent, cur)}</b><span class="sub">spent in ${esc(m.label)}</span></div>
      <div class="cop-donut">${donut(segs, { size: 150, sw: 18 })}<div class="mid"><b>${Math.round(p * 100)}%</b><span class="sub">of budget</span></div></div>
      <div class="cop-fig"><b>${money(m.budget, cur)}</b><span class="sub">total budget</span></div></div>
      <p class="cop-note">${left >= 0 ? `${money(left, cur)} left · about ${money(left / Math.max(1, daysLeft), cur)}/day for ${plural(daysLeft, 'day')}` : `${money(-left, cur)} over budget`}${t.stale ? ' · showing the last copy; Tim is unreachable' : ''}</p></section>
    <section class="card"><h2>Categories <span class="h-sub">tap one for transactions</span></h2><div class="cat-head"><span></span><span>CATEGORY</span><span>SPENT</span><span></span><span>BUDGET</span></div>${rows}</section>
    ${recent.length ? `<section class="card"><h2>Recent</h2>${Object.keys(byDate).sort().reverse().slice(0, 4).map(d => `<div class="date-h">${esc(fmtDay(d))}</div>${byDate[d].map(r => `<div class="crow" style="--a:${colorFor(r.category || 'x')}"><div><b>${esc(r.name)}</b><span class="sub" style="display:block"><i class="dotc" style="margin-right:6px"></i>${esc(r.category || '')}</span></div><span class="amt">${money(r.amount, cur)}</span></div>`).join('')}`).join('')}</section>` : ''}`;
}

function goalSection(state, g) {
  const entries = (state.money ?? []).filter(m => (m.goal || []).includes(g.id)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const received = entries.filter(e => e.status !== 'Pending'), pending = entries.filter(e => e.status === 'Pending');
  let run = g.current || 0;
  const pts = [{ x: state.cycle.start, y: run }, ...received.map(e => ({ x: e.date, y: (run += e.amount) }))];
  if (pts[pts.length - 1].x < state.today) pts.push({ x: state.today, y: run });
  const cur = g.currency || entries[0]?.currency || null, pendTotal = pending.reduce((a, e) => a + e.amount, 0);
  const open = sets.money.has(g.id), list = [...entries].reverse(), shown = open ? list : list.slice(0, 3);
  const chart = lineChart({ points: pts, target: g.target, targetLabel: 'Target', from: state.cycle.start, to: g.deadline && g.deadline > state.today ? g.deadline : state.today, fmt: v => (cur ? money(v, cur) : compact(v)) });
  const R = 2 * Math.PI * 38;
  return `<section class="card a3"><div class="gm-top"><h2 style="margin:0">${esc(shortTitle(g.title))}</h2>${chip(g.status)}</div>
    <div class="gauge-row" style="margin:16px 0 8px"><div class="ring a3" style="width:92px;height:92px"><svg width="92" height="92" viewBox="0 0 92 92"><circle class="rt" cx="46" cy="46" r="38" stroke-width="11"/><circle class="rp" cx="46" cy="46" r="38" stroke-width="11" stroke-dasharray="${R}" stroke-dashoffset="${R * (1 - Math.min(1, g.pct))}" transform="rotate(-90 46 46)"/></svg><div class="ri"><span class="mini" style="font-size:16px">${Math.round(g.pct * 100)}%</span></div></div>
      <div class="g-side"><b>${money(g.total, cur)}</b><span class="sub">of ${money(g.target, cur)}</span><div class="sub" style="margin-top:6px">${g.status === 'done' ? 'Goal reached.' : `${money(g.remaining, cur)} to go · ${g.daysLeft >= 0 ? plural(g.daysLeft, 'day') + ' left' : 'past deadline'}${g.perDay ? ` · ${money(g.perDay, cur)}/day` : ''}`}${pendTotal ? ` · ${money(pendTotal, cur)} pending` : ''}</div></div></div>
    ${chart}
    ${entries.length ? `<ul class="list" style="margin-top:6px">${shown.map(e => `<li><div class="li"><span class="bub">${icon(e.status === 'Pending' ? 'clock' : 'check', 17)}</span><div><b>${esc(e.title)}</b><span class="sub">${esc(fmtShort(e.date))} · ${esc(e.type || '')}${e.status === 'Pending' ? ' · pending' : ''}</span></div><b>${money(e.amount, e.currency)}</b></div></li>`).join('')}</ul>
      ${entries.length > 3 ? `<div style="text-align:center"><button class="tglb ${open ? 'open' : ''}" data-do="mtoggle" data-id="${esc(g.id)}">${open ? 'Show less' : `Show all ${entries.length}`}${icon('down', 14)}</button></div>` : ''}` : ''}</section>`;
}

export function moneyPage(state, A) {
  const mg = A.goals.filter(g => g.category === 'Money').sort((a, b) => (a.status === 'done') - (b.status === 'done') || a.daysLeft - b.daysLeft);
  return `${head('Money', 'Spending from Tim, goals from Notion. Currencies are never converted.')}
    <div class="cols a3"><div class="col">${spending(state)}</div>
    <div class="col">${mg.length ? mg.map(g => goalSection(state, g)).join('') : `<section class="card"><h2>Goals</h2>${empty('No money goals in Notion yet.')}</section>`}</div></div>`;
}
