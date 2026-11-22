// Hand-built SVG/HTML chart primitives. Rules (dataviz skill): one axis, thin marks
// (<=24px bars, 4px rounded data-end, 2px lines, >=8px markers with a 2px surface ring),
// hairline solid grid, selective direct labels, hover tooltip on every mark.
import { esc, f, clamp, compact } from './util.js';
import { fmtShort } from './util.js';
import { icon } from './icons.js';

let uid = 0;

export function ring(pct, size, inner, sw = 12) {
  const r = (size - sw) / 2, c = 2 * Math.PI * r, m = size / 2;
  return `<div class="ring" style="width:${size}px;height:${size}px" role="img" aria-label="${Math.round(pct * 100)} percent">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle class="rt" cx="${m}" cy="${m}" r="${r}" stroke-width="${sw}"/>
    <circle class="rp" cx="${m}" cy="${m}" r="${r}" stroke-width="${sw}" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - clamp(pct))}" transform="rotate(-90 ${m} ${m})"/></svg>
    <div class="ri">${inner}</div></div>`;
}

// Meter with an optional "where you should be by now" tick.
export function meter(pct, { pace = null, tone = '' } = {}) {
  return `<div class="meter ${tone}"><i style="width:${(clamp(pct) * 100).toFixed(1)}%"></i>${pace != null ? `<b class="pace" style="left:${(clamp(pace) * 100).toFixed(1)}%" title="Expected by now"></b>` : ''}</div>`;
}

// Seven columns (Mon-Sun) of daily completion.
export function weekBars(days) {
  const W = 320, H = 150, base = 120, n = days.length, bw = n > 8 ? 12 : 18, gap = (W - n * bw) / (n + 1);
  const g = [0, 50, 100].map(v => { const y = base - (v / 100) * 96; return `<line x1="0" x2="${W}" y1="${y}" y2="${y}" class="gl"/><text x="0" y="${y - 4}" class="gt">${v}%</text>`; }).join('');
  const bars = days.map((d, i) => {
    const x = gap + i * (bw + gap), h = d.pct == null ? 0 : Math.max(d.pct * 96, d.pct > 0 ? 3 : 0);
    const tip = d.tip || (d.future ? `${d.name}: upcoming` : `${d.name}: ${d.tasks[0]}/${d.tasks[1]} tasks · ${d.habits[0]}/${d.habits[1]} habits`);
    const bar = h ? `<path d="M${x} ${base}V${base - h + 4}a4 4 0 0 1 4-4h${bw - 8}a4 4 0 0 1 4 4V${base}z" class="${d.isToday ? 'bar-now' : 'bar-mk'}"/>` : `<rect x="${x}" y="${base - 2}" width="${bw}" height="2" rx="1" class="bar-empty"/>`;
    return `<g data-tip="${esc(tip)}" tabindex="0"><rect x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}" fill="transparent"/>${bar}<text x="${x + bw / 2}" y="${H - 8}" text-anchor="middle" class="gt ${d.isToday ? 'gt-now' : ''}">${d.label}</text></g>`;
  }).join('');
  return `<svg class="chart wk" viewBox="0 0 ${W} ${H}" role="img" aria-label="Completion by day">${g}${bars}</svg>`;
}

// Compact seven-day column chart for the dashboard (today highlighted, past muted).
export function miniWeek(days) {
  const W = 224, H = 76, base = 56, bw = 16, gap = (W - 7 * bw) / 8;
  const bars = days.map((d, i) => {
    const x = gap + i * (bw + gap), h = d.pct == null ? 0 : Math.max(d.pct * 50, d.pct > 0 ? 3 : 0);
    const tip = d.future ? `${d.name}: upcoming` : `${d.name}: ${d.tasks[0]}/${d.tasks[1]} tasks · ${d.habits[0]}/${d.habits[1]} habits`;
    const bar = h ? `<path d="M${x} ${base}V${base - h + 4}a4 4 0 0 1 4-4h${bw - 8}a4 4 0 0 1 4 4V${base}z" class="${d.isToday ? 'bar-now' : 'bar-mk'}"/>` : `<rect x="${x}" y="${base - 2}" width="${bw}" height="2" rx="1" class="bar-empty"/>`;
    return `<g class="chart" data-tip="${esc(tip)}" tabindex="0"><rect x="${x - gap / 2}" y="0" width="${bw + gap}" height="${H}" fill="transparent"/>${bar}<text x="${x + bw / 2}" y="${H - 6}" text-anchor="middle" class="gt ${d.isToday ? 'gt-now' : ''}">${d.label}</text></g>`;
  }).join('');
  return `<svg class="mini-week" viewBox="0 0 ${W} ${H}" role="img" aria-label="Completion by day this week">${bars}</svg>`;
}

// Rows of cells; v in [0,1] (binary: 0/1) or null (no row). Sequential 5-step single hue.
export function heat(rows, { cols = 7, labels = [] } = {}) {
  const lvl = v => (v == null ? 'hn' : v === 0 ? 'h0' : v < .34 ? 'h1' : v < .67 ? 'h2' : v < 1 ? 'h3' : 'h4');
  return `<div class="heat" style="--cols:${cols}">
    ${labels.length ? `<div class="heat-head"><span></span><div class="heat-cells">${labels.map(l => `<em>${esc(l)}</em>`).join('')}</div><span></span></div>` : ''}
    ${rows.map(r => `<div class="heat-row"><span class="heat-label">${r.icon ? icon(r.icon, 15) : ''}${esc(r.label)}</span><div class="heat-cells">${r.cells.map(c => `<i class="${lvl(c.v)}" data-tip="${esc(c.tip || '')}" tabindex="0"></i>`).join('')}</div><span class="heat-right">${r.right || ''}</span></div>`).join('')}</div>`;
}

export function spark(values, { w = 120, h = 32 } = {}) {
  const pts = values.map((v, i) => (v == null ? null : [i, v])).filter(Boolean);
  if (pts.length < 2) return '';
  const max = Math.max(...pts.map(p => p[1]), 1), min = Math.min(...pts.map(p => p[1]), 0);
  const X = i => 4 + (i / (values.length - 1)) * (w - 8), Y = v => 4 + (1 - (v - min) / (max - min || 1)) * (h - 8);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)} ${Y(p[1]).toFixed(1)}`).join('');
  const last = pts[pts.length - 1];
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" class="ln"/><circle cx="${X(last[0]).toFixed(1)}" cy="${Y(last[1]).toFixed(1)}" r="4" class="dot"/></svg>`;
}

// Binary 28-day strip for habit cards.
export function strip(values) {
  return `<div class="strip">${values.map(v => `<i class="${v == null ? 'hn' : v ? 'h4' : 'h0'}"></i>`).join('')}</div>`;
}

// Single-series line over time. y gets a hairline grid; target is a labelled reference line.
export function lineChart({ points, target = null, targetLabel = 'Target', unit = '', w = 360, h = 170, fmt = v => compact(v), from = null, to = null, zero = true }) {
  if (points.length < 2) return '<div class="empty">Not enough points yet for a trend.</div>';
  const px = 36, py = 18, pr = 14;
  const ys = points.map(p => p.y); if (target != null) ys.push(target);
  const nice = v => { const p = 10 ** Math.floor(Math.log10(v || 1)), n = (v || 1) / p; return ([1, 2, 4, 6, 8, 10].find(x => x >= n - 1e-9)) * p; };
  let lo, hi;
  if (zero) { lo = Math.min(0, ...ys); hi = nice(Math.max(...ys, 1)); }
  else { const mn = Math.min(...ys), mx = Math.max(...ys), pd = Math.max((mx - mn) * .2, .5); lo = mn - pd; hi = mx + pd; }
  const t = k => new Date(k + 'T00:00:00Z').getTime();
  const t0 = t(from || points[0].x), t1 = t(to || points[points.length - 1].x);
  const X = k => px + (t1 === t0 ? .5 : (t(k) - t0) / (t1 - t0)) * (w - px - pr);
  const Y = v => py + (1 - (v - lo) / (hi - lo)) * (h - py - 26);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join('');
  const area = `${line}L${X(points[points.length - 1].x).toFixed(1)} ${h - 26}L${X(points[0].x).toFixed(1)} ${h - 26}Z`;
  const grid = [0, .5, 1].map(q => { const v = lo + (hi - lo) * q; return `<line x1="${px}" x2="${w - pr}" y1="${Y(v)}" y2="${Y(v)}" class="gl"/><text x="0" y="${Y(v) + 3}" class="gt">${fmt(v)}</text>`; }).join('');
  const last = points[points.length - 1];
  const tgt = target != null ? `<line x1="${px}" x2="${w - pr}" y1="${Y(target)}" y2="${Y(target)}" class="goalline"/><text x="${px + 4}" y="${Y(target) - 5}" class="gt gt-ink">${esc(targetLabel)} ${fmt(target)}</text>` : '';
  const hits = points.map(p => `<circle cx="${X(p.x).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="12" fill="transparent" data-tip="${esc(`${fmtShort(p.x)}: ${fmt(p.y)}${unit}`)}" tabindex="0"/>`).join('');
  return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="Trend">${grid}${tgt}<path d="${area}" class="area"/><path d="${line}" class="ln"/>
    <circle cx="${X(last.x).toFixed(1)}" cy="${Y(last.y).toFixed(1)}" r="5" class="dot now"/>
    <text x="${Math.min(X(last.x), w - pr)}" y="${Y(last.y) - 11}" text-anchor="end" class="gt gt-ink">${fmt(last.y)}${unit}</text>
    <text x="${px}" y="${h - 6}" class="gt">${esc(fmtShort(from || points[0].x))}</text><text x="${w - pr}" y="${h - 6}" text-anchor="end" class="gt">${esc(fmtShort(to || last.x))}</text>${hits}</svg>`;
}

// Ranked horizontal bars. over:true flags a value past its limit (icon + label, not colour alone).
export function hbars(items, { fmt = v => compact(v) } = {}) {
  const max = Math.max(...items.map(i => Math.max(i.value, i.limit || 0)), 1);
  return `<div class="hbars">${items.map(i => `<div class="hb" data-tip="${esc(i.tip || '')}" tabindex="0">
    <span class="hb-l">${esc(i.label)}</span>
    <div class="hb-t"><i class="${i.over ? 'over' : ''}" style="width:${(i.value / max * 100).toFixed(1)}%"></i>${i.limit ? `<b style="left:${(i.limit / max * 100).toFixed(1)}%"></b>` : ''}</div>
    <span class="hb-v">${fmt(i.value)}${i.over ? ` <em class="st-crit-t">${icon('alert', 12)} over</em>` : ''}</span></div>`).join('')}</div>`;
}

// Tooltip layer: one element, driven by [data-tip] anywhere. Works for hover, focus and tap.
export function initTips() {
  if (initTips.done) return; initTips.done = true;
  const tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
  const show = (el, x, y) => {
    const t = el.getAttribute('data-tip'); if (!t) return hide();
    tip.textContent = t; tip.classList.add('on');
    const r = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(Math.max(x - r.width / 2, 8), innerWidth - r.width - 8)}px`;
    tip.style.top = `${Math.max(8, y - r.height - 14)}px`;
  };
  const hide = () => tip.classList.remove('on');
  document.addEventListener('pointerover', e => { const el = e.target.closest?.('[data-tip]'); if (el) show(el, e.clientX, e.clientY); });
  document.addEventListener('pointermove', e => { const el = e.target.closest?.('[data-tip]'); if (el && tip.classList.contains('on')) show(el, e.clientX, e.clientY); });
  document.addEventListener('pointerout', e => { if (e.target.closest?.('[data-tip]')) hide(); });
  document.addEventListener('focusin', e => { const el = e.target.closest?.('[data-tip]'); if (el) { const b = el.getBoundingClientRect(); show(el, b.left + b.width / 2, b.top); } });
  document.addEventListener('focusout', hide);
  addEventListener('scroll', hide, { passive: true });
}
