import { esc, compact, fmtShort, plural } from '../util.js';
import { icon } from '../icons.js';
import { hbars } from '../charts.js';
import { card, tile, head, empty } from '../ui.js';
import { diffDays } from '../dates.js';

export const filter = { type: 'All' };

export function career(state, A) {
  const C = A.career, all = state.career ?? [];
  const types = ['All', ...new Set(all.map(c => c.type).filter(Boolean))];
  const rows = all.filter(c => filter.type === 'All' || c.type === filter.type)
    .sort((a, b) => (a.nextDate || '9999').localeCompare(b.nextDate || '9999'));
  const openOutsets = C.active.filter(c => c.type === 'Outsets').reduce((a, c) => a + (c.value || 0), 0);
  const stages = C.stageCounts.filter(s => s.n || ['Lead', 'Contacted', 'Conversation', 'Won'].includes(s.stage)).map(s => ({ label: s.stage, value: s.n, tip: `${s.stage}: ${s.n}` }));
  const nxt = C.nextActions.slice(0, 6);
  return `${head('Career pipeline', 'Jobs, outsets, hackathons and scholarships.')}
    <div class="grid12">
      ${card('s12', 'Overview', `<div class="tiles t4">${tile('In play', C.active.length)}${tile('Contacted', C.contactedWeek, 'this week')}${tile('Open Outsets value', '$' + compact(openOutsets))}${tile('Won', all.filter(c => c.stage === 'Won').length)}</div>`)}
      ${card('s5', 'By stage', hbars(stages, { fmt: v => String(v) }))}
      ${card('s7', 'Next actions', nxt.length ? `<ul class="rows">${nxt.map(c => { const d = diffDays(c.nextDate, state.today); return `<li class="row-i"><span class="ri-ic ${d < 0 ? 'miss' : ''}">${icon(d < 0 ? 'alert' : 'career', 16)}</span><div><b>${esc(c.title)}</b><span class="sub">${esc(c.next)}</span></div><span class="sub ${d < 0 ? 'st-crit-t' : ''}">${d < 0 ? `${plural(-d, 'day')} overdue` : d === 0 ? 'today' : fmtShort(c.nextDate)}</span></li>`; }).join('')}</ul>` : empty('No follow-ups scheduled.'))}
      <div class="s12"><div class="chips seg-scroll">${types.map(t => `<button class="${t === filter.type ? 'on' : ''}" data-do="career-type" data-type="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
      ${card('s12', `All opportunities <span class="sub h-sub">${rows.length}</span>`, rows.length ? `<div class="tv-scroll"><table class="tbl"><thead><tr><th>Who</th><th>Type</th><th>Stage</th><th>Value</th><th>Next</th></tr></thead><tbody>${rows.map(c => `<tr><td><b>${esc(c.title)}</b><span class="sub">${esc(c.role || '')}</span></td><td>${esc(c.type || '')}</td><td>${esc(c.stage || '')}</td><td>${c.value ? '$' + compact(c.value) : '-'}</td><td>${c.nextDate ? esc(fmtShort(c.nextDate)) : '-'}<span class="sub">${esc(c.next || '')}</span></td></tr>`).join('')}</tbody></table></div>` : empty('Nothing here yet.'))}
    </div>`;
}
