import { esc, compact, pct, money, moneyFull, fmtShort, plural, f } from '../util.js';
import { chip, icon } from '../icons.js';
import { meter, lineChart, hbars } from '../charts.js';
import { card, tile, head, empty } from '../ui.js';
import { shortTitle } from '../insights.js';
import { addDays, diffDays } from '../dates.js';

function timSection(state) {
  const t = state.tim;
  if (!t) return card('s12', 'Spending vs budget (Tim)', `<div class="connect">${icon('money', 28)}<div><b>Connect Tim to see spending vs budget here.</b>
    <p class="sub">Set <code>TIM_URL</code> (and <code>TIM_TOKEN</code>) in Vercel. Momentum reads <code>GET /api/momentum</code> from Tim: this month's budget and spend by category, savings and recent transactions. See SETUP.md for the exact shape.</p></div></div>`);
  if (t.error) return card('s12', 'Spending vs budget (Tim)', `<div class="warn-bar">${icon('alert', 16)} Couldn't reach Tim: ${esc(t.error)}</div>`);
  const m = t.month, cur = t.currency, left = m.budget - m.spent;
  const dim = new Date(Date.UTC(+state.today.slice(0, 4), +state.today.slice(5, 7), 0)).getUTCDate(), dom = +state.today.slice(8);
  const cats = [...m.categories].sort((a, b) => b.spent - a.spent).map(c => ({ label: c.name, value: c.spent, limit: c.budget, over: c.spent > c.budget, tip: `${c.name}: ${moneyFull(c.spent, cur)} of ${moneyFull(c.budget, cur)}` }));
  return `${card('s5', `${esc(m.label)} budget`, `<div class="big-fig">${money(m.spent, cur)}<small> of ${money(m.budget, cur)}</small></div>${meter(m.spent / m.budget, { pace: dom / dim, tone: m.spent > m.budget ? 'bad' : '' })}
    <p class="sub">${left >= 0 ? `${money(left, cur)} left · ${money(left / Math.max(1, dim - dom + 1), cur)}/day for ${plural(dim - dom + 1, 'day')}` : `${money(-left, cur)} over budget`}. The tick shows how much of the month has passed.</p>
    ${t.stale ? '<p class="sub">Showing the last copy; Tim is unreachable right now.</p>' : ''}`)}
    ${card('s7', 'By category', hbars(cats, { fmt: v => money(v, cur) }) + '<p class="sub" style="margin-top:8px">Bar = spent, tick = category budget.</p>')}
    ${(t.recent || []).length ? card('s7', 'Recent', `<ul class="rows">${t.recent.slice(0, 6).map(r => `<li class="row-i"><span class="ri-ic">${icon('money', 16)}</span><div><b>${esc(r.name)}</b><span class="sub">${esc(r.category || '')} · ${esc(fmtShort(r.date))}</span></div><b>${money(r.amount, cur)}</b></li>`).join('')}</ul>`) : ''}
    ${(t.savings || []).length ? card('s5', 'Savings (Tim)', t.savings.map(s => `<div class="mm"><div class="gm-top"><b>${esc(s.name)}</b></div>${meter(s.saved / s.target)}<span class="sub">${money(s.saved, s.currency || cur)} of ${money(s.target, s.currency || cur)}</span></div>`).join('')) : ''}`;
}

function goalSection(state, A, g) {
  const entries = (state.money ?? []).filter(m => (m.goal || []).includes(g.id)).sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const received = entries.filter(e => e.status !== 'Pending'), pending = entries.filter(e => e.status === 'Pending');
  let run = g.current || 0;
  const pts = [{ x: state.cycle.start, y: run }, ...received.map(e => ({ x: e.date, y: (run += e.amount) }))];
  if (pts[pts.length - 1].x < state.today) pts.push({ x: state.today, y: run });
  const cur = g.currency || entries[0]?.currency || null;
  const pendTotal = pending.reduce((a, e) => a + e.amount, 0);
  const chart = lineChart({ points: pts, target: g.target, targetLabel: 'Target', from: state.cycle.start, to: g.deadline && g.deadline > state.today ? g.deadline : state.today, fmt: v => (cur ? money(v, cur) : compact(v)) });
  return card('s6 money-goal', `${esc(shortTitle(g.title))} ${chip(g.status)}`, `
    <div class="g-nums"><b>${money(g.total, cur)}</b><span class="sub">of ${money(g.target, cur)}</span><em>${pct(g.pct)}</em></div>${meter(g.pct, { pace: g.elapsed })}
    <p class="sub">${g.status === 'done' ? 'Goal reached.' : `${money(g.remaining, cur)} to go · ${g.daysLeft >= 0 ? plural(g.daysLeft, 'day') + ' left' : 'past deadline'}${g.perDay ? ` · ${money(g.perDay, cur)}/day needed` : ''}`}${pendTotal ? ` · ${money(pendTotal, cur)} pending` : ''}</p>
    ${chart}
    ${entries.length ? `<ul class="rows">${[...entries].reverse().slice(0, 4).map(e => `<li class="row-i"><span class="ri-ic">${icon(e.status === 'Pending' ? 'clock' : 'check', 16)}</span><div><b>${esc(e.title)}</b><span class="sub">${esc(fmtShort(e.date))} · ${esc(e.type || '')}${e.status === 'Pending' ? ' · pending' : ''}</span></div><b>${money(e.amount, e.currency)}</b></li>`).join('')}</ul>` : ''}`);
}

export function moneyPage(state, A) {
  const mg = A.goals.filter(g => g.category === 'Money').sort((a, b) => (a.status === 'done') - (b.status === 'done') || a.daysLeft - b.daysLeft);
  const open = mg.filter(g => g.status !== 'done');
  return `${head('Money', 'Goals from Notion, spending from Tim.')}
    <div class="grid12">
      ${card('s12', 'Overview', `<div class="tiles t4">${tile('Money goals', mg.length)}${tile('Done', mg.filter(g => g.status === 'done').length)}${tile('Needs attention', open.filter(g => ['at-risk', 'behind', 'overdue'].includes(g.status)).length)}${tile('Pending in', (state.money ?? []).filter(m => m.status === 'Pending').length, 'entries')}</div>
        <p class="sub" style="margin-top:12px">Currencies are never converted: each goal is shown in its own currency.</p>`)}
      ${timSection(state)}
      ${mg.length ? mg.map(g => goalSection(state, A, g)).join('') : card('s12', 'Goals', empty('No money goals in Notion yet.'))}
    </div>`;
}
void f; void addDays; void diffDays;
