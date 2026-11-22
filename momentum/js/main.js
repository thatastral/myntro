import * as Sync from './sync.js';
import * as Fit from './fitness.js';
import { analyze } from './insights.js';
import { initTips } from './charts.js';
import { icon } from './icons.js';
import { $, $$, ago, toast, esc } from './util.js';
import { habitChips } from './ui.js';
import { home, ui as homeUi } from './pages/home.js';
import { habits } from './pages/habits.js';
import { goals, filter as goalFilter } from './pages/goals.js';
import { moneyPage } from './pages/money.js';
import { career, filter as careerFilter } from './pages/career.js';

const NAV = [['', 'Home', 'home'], ['fitness', 'Fitness', 'fitness'], ['habits', 'Habits', 'habits'], ['goals', 'Goals', 'goals'], ['money', 'Money', 'money'], ['career', 'Career', 'career']];
const PAGES = { '': home, habits, goals, money: moneyPage, career };
let fitReady = false;

function route() {
  const [page = '', sub = '', arg = ''] = location.hash.replace(/^#\/?/, '').split('/');
  return { page: page in PAGES || page === 'fitness' ? page : '', sub, arg };
}

function buildNav() {
  const link = ([k, l, ic]) => `<a href="#/${k}" data-page="${k}">${icon(ic, 22)}<span>${l}</span></a>`;
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
  const s = Sync.getState(); if (!s?.habits) return '';
  return `<div class="card"><h2>Today in Notion <span class="sub h-sub">syncs both ways</span></h2>${habitChips(s, analyze(s), { keys: ['Workout', 'Hydrate 1.5L'] })}
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
