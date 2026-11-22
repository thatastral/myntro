import * as Sync from './sync.js';
import * as Fit from './fitness.js';
import { analyze } from './insights.js';
import { initTips } from './charts.js';
import { icon } from './icons.js';
import { $, $$, ago, toast, esc } from './util.js';
import { habitChips, sets, streakBanner } from './ui.js';
import { ring, weekBars } from './charts.js';
import { addDays } from './dates.js';
import { home, ui as homeUi } from './pages/home.js';
import { habits } from './pages/habits.js';
import { goals, filter as goalFilter } from './pages/goals.js';
import { moneyPage } from './pages/money.js';
import { career, filter as careerFilter } from './pages/career.js';

const NAV = [['', 'Home', 'home', 1], ['fitness', 'Fitness', 'fitness', 2], ['habits', 'Habits', 'habits', 4], ['goals', 'Goals', 'goals', 6], ['money', 'Money', 'money', 3], ['career', 'Career', 'career', 5]];
const PAGES = { '': home, habits, goals, money: moneyPage, career };
let fitReady = false;

function route() {
  const [page = '', sub = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { page: page in PAGES || page === 'fitness' ? page : '', sub, arg };
}

function buildNav() {
  const link = ([k, l, ic, n]) => `<a class="a${n}" href="#/${k}" data-page="${k}">${icon(ic, 22)}<span>${l}</span></a>`;
  $('#sideNav').innerHTML = NAV.map(link).join('');
  $('#bottomNav').innerHTML = NAV.map(link).join('');
}
const setActive = page => $$('[data-page]').forEach(a => a.classList.toggle('on', a.dataset.page === page));

function render({ scroll = false } = {}) {
  const state = Sync.getState(), r = route();
  setActive(r.page);
  const view = $('#view');
  if (!state) { view.innerHTML = '<div class="skeleton"><i></i><i></i><i></i></div>'; return; }
  if (r.page === 'fitness') {
    if (fitReady) Fit.renderFitness(view, r.sub, r.arg);
    else view.innerHTML = '<div class="card">Fitness storage is unavailable in this browser mode.</div>';
  } else {
    view.innerHTML = PAGES[r.page](state, analyze(state), { fitness: fitReady ? Fit.summary() : null });
  }
  if (scroll) scrollTo(0, 0);
}

// Live updates re-render in place. Fitness sub-pages hold forms, so only its overview refreshes.
Sync.subscribe(() => {
  const r = route();
  if (r.page === 'fitness' && r.sub) return;
  const y = scrollY; render(); scrollTo(0, y);
});

function paintSync() {
  const s = Sync.getStatus(), pend = s.pending ? ` · ${s.pending} to sync` : '';
  const m = {
    live: ['live', `Live · ${ago(Date.now() - s.at)}${pend}`], syncing: ['busy', 'Syncing…'], idle: ['busy', 'Connecting…'],
    offline: ['off', `Offline${pend}`], error: ['err', `Notion unreachable · retrying${pend}`], auth: ['err', 'Signed out'],
  }[s.kind] || ['busy', '…'];
  for (const id of ['#syncSide', '#syncTop']) { const el = $(id); if (el) { el.className = `sync ${m[0]}`; el.innerHTML = `<i></i><span>${esc(m[1])}</span>`; } }
  document.title = Sync.getState()?.demo ? 'Momentum (demo)' : 'Momentum';
}
Sync.subscribeStatus(() => {
  paintSync();
  const needLogin = Sync.getStatus().kind === 'auth';
  $('#login').hidden = !needLogin; $('#app').hidden = needLogin;
  if (needLogin) setTimeout(() => $('#passcode')?.focus(), 50);
});
setInterval(paintSync, 1000);

// ---- events
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-do]'); if (!el) return;
  const d = el.dataset, state = Sync.getState();
  switch (d.do) {
    case 'tick': {
      const h = state?.habits.list.find(x => x.key === d.habit);
      if (!h?.writable) return toast('Read-only for now. Tick it in Notion.');
      Sync.setHabit(d.habit, d.date, !Sync.habitDone(d.habit, d.date)); break;
    }
    case 'task': homeUi.open.has(d.id) ? homeUi.open.delete(d.id) : homeUi.open.add(d.id); render(); break;
    case 'toggle': homeUi[d.key] = !homeUi[d.key]; render(); break;
    case 'mtoggle': sets.money.has(d.id) ? sets.money.delete(d.id) : sets.money.add(d.id); render(); break;
    case 'mcat': sets.cats.has(d.name) ? sets.cats.delete(d.name) : sets.cats.add(d.name); render(); break;
    case 'ctoggle': sets.careerAll = !sets.careerAll; render(); break;
    case 'goal-cat': goalFilter.cat = d.cat; render(); break;
    case 'career-type': careerFilter.type = d.type; render(); break;
    case 'refresh': Sync.refresh({ fresh: true }); break;
    case 'logout': await Sync.logout(); break;
  }
});
addEventListener('hashchange', () => render({ scroll: true }));

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button'), err = $('#loginErr'); err.textContent = ''; btn.disabled = true;
  try { await Sync.login($('#passcode').value); $('#passcode').value = ''; render(); }
  catch (x) { err.textContent = x.message; }
  btn.disabled = false;
});

// ---- Fitness <-> Notion
Fit.hooks.onActivity = date => Sync.tickOn('Workout', date); // finish a session -> Workout ticked in Notion
Fit.hooks.header = () => {
  const st = Sync.getState(); if (!st?.habits) return '';
  const A = analyze(st), local = Fit.activeDates(), mins = Fit.dailyMinutes();
  const done = d => !!st.habits.days.find(x => x.date === d)?.done['Workout'] || local.has(d); // Notion tick OR a logged session
  let streak = 0;
  for (let d = done(st.today) ? st.today : addDays(st.today, -1); done(d); d = addDays(d, -1)) streak++;
  const week = A.week.map(w => ({ ...w, done: !w.future && done(w.date) }));
  const count = week.filter(w => w.done).length, target = st.targets?.workoutsPerWeek || 4;
  const maxM = Math.max(30, ...week.map(w => mins[w.date] || 0));
  const bars = week.map(w => ({ ...w, pct: w.future ? null : (mins[w.date] || 0) / maxM, tip: w.future ? `${w.name}: upcoming` : `${w.name}: ${Math.round(mins[w.date] || 0)} min${w.done ? ' · workout done' : ''}` }));
  const msg = streak >= 5 ? 'On fire. Keep it going.' : streak >= 2 ? 'Look at you go!' : streak === 1 ? 'Nice start. Come back tomorrow.' : 'Log a session to start a streak.';
  return `${streakBanner({ n: streak, title: 'Workout streak', sub: msg, days: week, area: 2 })}
    <div class="card a2"><h2>Workouts this week <span class="h-sub">goal: ${target}</span></h2>
      <div class="wk-goal">${ring(Math.min(1, count / target), 132, `<b class="wk-n">${count}</b><span class="sub">of ${target}</span>`, 14, 2)}<div class="wk-bars"><div class="label" style="margin-bottom:4px">Active minutes</div>${weekBars(bars, { fmtTick: v => `${Math.round(v / 100 * maxM)}m` })}</div></div></div>
    <div class="card"><h2>Today in Notion <span class="h-sub">syncs both ways</span></h2>${habitChips(st, A, { keys: ['Workout', 'Hydrate 1.5L'] })}
    <p class="sub" style="margin-top:10px">Logging a session ticks Workout in Notion automatically. Water syncs whichever side you tick it on.</p></div>`;
};

// ---- boot
(async function boot() {
  buildNav(); initTips();
  Sync.loadCache(); paintSync();
  if (Sync.getState()) { $('#app').hidden = false; render(); } // instant paint from the cached copy
  try { await Fit.initFitness(); fitReady = true; } catch { fitReady = false; }
  const k = await Sync.refresh();
  if (k === 'auth') { $('#login').hidden = false; $('#app').hidden = true; } else { $('#app').hidden = false; }
  render(); Sync.start();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
