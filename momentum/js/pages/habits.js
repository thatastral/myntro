import { esc, pct, f } from '../util.js';
import { icon } from '../icons.js';
import { heat, strip, weekBars } from '../charts.js';
import { card, tile, head, habitChips } from '../ui.js';
import { addDays, weekStart, dayLabel } from '../dates.js';
import { fmtShort } from '../util.js';

const delta = (a, b) => { const d = Math.round((a - b) * 100); return d === 0 ? '<span class="sub">flat vs last week</span>' : `<span class="${d > 0 ? 'up' : 'down'}">${icon(d > 0 ? 'check' : 'alert', 12)} ${d > 0 ? '+' : ''}${d} pts vs last week</span>`; };

export function habits(state, A) {
  const list = state.habits?.list ?? [], days = state.habits?.days ?? [], today = state.today;
  const N = 28, dates = Array.from({ length: N }, (_, i) => addDays(today, i - N + 1));
  const rows = list.map(h => ({ label: h.label, icon: h.icon, cells: dates.map(d => {
    const r = days.find(x => x.date === d);
    return { v: r ? (r.done[h.key] ? 1 : 0) : null, tip: `${h.label} · ${fmtShort(d)}: ${r ? (r.done[h.key] ? 'done' : 'not done') : 'no data'}` };
  }), right: `<span class="streak">${A.hs[h.key].streak ? icon('flame', 13) + A.hs[h.key].streak : '-'}</span>` }));

  // consistency by week (all habits, completed days only)
  const weeks = new Map();
  for (const d of days) { if (d.date > today) continue; const k = weekStart(d.date); const w = weeks.get(k) || { done: 0, total: 0 }; w.done += list.filter(h => d.done[h.key]).length; w.total += list.length; weeks.set(k, w); }
  const wk = [...weeks.entries()].sort().slice(-12).map(([k, w], i, a) => ({ date: k, label: String(i + 1), pct: w.total ? w.done / w.total : 0, future: false, isToday: i === a.length - 1,
    tip: `Week of ${fmtShort(k)}: ${Math.round((w.total ? w.done / w.total : 0) * 100)}% of habits` }));

  const perfect = days.filter(d => d.date <= today && list.length && list.every(h => d.done[h.key])).length;
  const bestH = list.map(h => ({ h, s: A.hs[h.key] })).sort((a, b) => b.s.streak - a.s.streak)[0];
  const last7 = (() => { let k = 0, t = 0; for (let i = 0; i < 7; i++) { const r = days.find(x => x.date === addDays(today, -i)); if (!r) continue; t += list.length; k += list.filter(h => r.done[h.key]).length; } return t ? k / t : 0; })();

  const groups = [...new Set(list.map(h => h.group))];
  const cards = groups.map(g => `<h3 class="grp-h">${esc(g)}</h3><div class="hcards">${list.filter(h => h.group === g).map(h => { const s = A.hs[h.key];
    return `<article class="hcard"><header><span class="hc-ic">${icon(h.icon, 18)}</span><b>${esc(h.label)}</b>${s.streak ? `<span class="streak">${icon('flame', 13)}${s.streak}d</span>` : ''}</header>
      <div class="hc-nums"><div><b>${pct(s.rate7)}</b><span class="sub">7 days</span></div><div><b>${pct(s.rate30)}</b><span class="sub">30 days</span></div><div><b>${s.best}d</b><span class="sub">best run</span></div></div>
      ${strip(s.spark)}<p class="sub">${delta(s.rate7, s.ratePrev7)} · ${s.weekDone} this week</p></article>`; }).join('')}</div>`).join('');

  return `${head('Habits', 'Everything you tick in Notion, charted.')}
    <div class="grid12">
      ${card('s12', 'Today', habitChips(state, A))}
      ${card('s12', 'Overview', `<div class="tiles t4">${tile('Last 7 days', pct(last7), 'of all habits')}${tile('Perfect days', perfect, 'every habit ticked')}${tile('Longest streak', bestH?.s.streak ? `${bestH.s.streak}d` : '-', bestH?.s.streak ? esc(bestH.h.label) : '')}${tile('This week', `${A.weekStats.habits[0]}<small>/${A.weekStats.habits[1]}</small>`)}</div>`)}
      ${card('s12', 'Last 4 weeks', heat(rows, { cols: N, labels: dates.map((d, i) => (i % 7 === 0 || i === N - 1 ? String(+d.slice(8)) : '')) }) +
        `<details class="tv"><summary>View as table</summary><div class="tv-scroll"><table><thead><tr><th></th>${dates.slice(-7).map(d => `<th>${dayLabel(d)[0]}</th>`).join('')}</tr></thead><tbody>${list.map(h => `<tr><th>${esc(h.label)}</th>${dates.slice(-7).map(d => `<td>${days.find(x => x.date === d)?.done[h.key] ? 'done' : '·'}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`)}
      ${card('s7', 'Weekly consistency', wk.length > 1 ? weekBars(wk) : '<div class="empty">Needs a couple of weeks of data.</div>')}
      ${card('s5', 'How to read this', `<p class="sub">Streaks keep going while today is still open, so you're never penalised mid-day. A habit with no tick for 3+ days shows up under <b>Needs fixing</b> on Home.</p>`)}
    </div>
    <div class="grid12"><div class="s12">${cards}</div></div>`;
}
void f;
