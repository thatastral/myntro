// Client data engine. Speed comes from four things:
//  1. last state is cached locally -> the UI paints instantly, before any network
//  2. a tiny poll every 8s (server answers {unchanged:true} in a few bytes) + on focus/online
//  3. ticks are optimistic (UI flips immediately) and queued, so they survive offline
//  4. after a write we re-read straight away instead of waiting for the next poll
import { toast } from './util.js';

const KEY = 'mm_state_v1', QKEY = 'mm_queue_v1', POLL_MS = 8000;
let state = null, version = null, timer = null, inflight = false, flushing = false;
const status = { kind: 'idle', at: 0, pending: 0, error: null };
const onState = new Set(), onStatus = new Set();

export const getState = () => state;
export const getStatus = () => status;
export const subscribe = (fn) => (onState.add(fn), () => onState.delete(fn));
export const subscribeStatus = (fn) => (onStatus.add(fn), () => onStatus.delete(fn));
const emitState = () => onState.forEach(fn => fn(state));
const emitStatus = () => onStatus.forEach(fn => fn(status));

const queue = () => { try { return JSON.parse(localStorage.getItem(QKEY) || '[]'); } catch { return []; } };
const saveQueue = q => { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch { /* storage full/blocked */ } status.pending = q.length; };
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* ignore */ } };

export function loadCache() {
  try { const raw = localStorage.getItem(KEY); if (raw) { state = JSON.parse(raw); version = state.version; } } catch { /* ignore */ }
  status.pending = queue().length;
  return state;
}

// Re-apply not-yet-flushed ticks so the UI never flickers back to stale data.
function overlayPending(s) {
  for (const t of queue()) { const d = s.habits?.days.find(x => x.date === t.date); if (d) d.done[t.habit] = t.value; }
  return s;
}

export async function refresh({ fresh = false } = {}) {
  if (inflight) return; inflight = true;
  if (status.kind !== 'live') { status.kind = 'syncing'; emitStatus(); }
  try {
    const q = new URLSearchParams(); if (version && !fresh) q.set('v', version); if (fresh) q.set('fresh', '1');
    const res = await fetch(`/api/state?${q}`, { credentials: 'same-origin', cache: 'no-store' });
    if (res.status === 401) { status.kind = 'auth'; return 'auth'; }
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `HTTP ${res.status}`);
    const j = await res.json();
    if (!j.unchanged) { state = overlayPending(j); version = j.version; persist(); emitState(); }
    Object.assign(status, { kind: 'live', at: Date.now(), error: null });
  } catch (e) {
    status.kind = navigator.onLine ? 'error' : 'offline'; status.error = e.message;
  } finally { inflight = false; emitStatus(); }
  return status.kind;
}

export async function login(passcode) {
  const res = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ passcode }) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Could not sign in');
  version = null; await refresh({ fresh: true });
}
export async function logout() {
  await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
  try { localStorage.removeItem(KEY); localStorage.removeItem(QKEY); } catch { /* ignore */ }
  state = null; version = null; status.kind = 'auth'; emitState(); emitStatus();
}

export function start() {
  clearInterval(timer);
  timer = setInterval(() => { if (document.visibilityState === 'visible') refresh(); }, POLL_MS);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { flush(); refresh(); } });
  addEventListener('focus', () => refresh());
  addEventListener('online', () => { flush(); refresh({ fresh: true }); });
  addEventListener('offline', () => { status.kind = 'offline'; emitStatus(); });
  flush();
}

// ---- writes (only habits the server whitelists) ----
export const habitDone = (habit, date) => !!state?.habits?.days.find(d => d.date === date)?.done[habit];

export function setHabit(habit, date, value) {
  const day = state?.habits?.days.find(d => d.date === date);
  if (day) day.done[habit] = value;
  const q = queue().filter(t => !(t.habit === habit && t.date === date));
  q.push({ habit, date, value, t: Date.now() }); saveQueue(q);
  persist(); emitState(); emitStatus(); flush();
}
// One-way tick (used when a fitness session is logged): never un-ticks anything.
export const tickOn = (habit, date) => { if (!habitDone(habit, date)) setHabit(habit, date, true); };

async function flush() {
  if (flushing) return; flushing = true;
  try {
    for (;;) {
      const t = queue()[0]; if (!t) break;
      const res = await fetch('/api/tick', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin',
        body: JSON.stringify({ habit: t.habit, date: t.date, value: t.value }) }).catch(() => null);
      if (!res) { status.kind = 'offline'; break; }          // no network: keep it queued
      if (res.status === 401) { status.kind = 'auth'; break; }
      if (res.status >= 500) { status.kind = 'error'; break; } // Notion/server hiccup: retry later
      if (!res.ok) { toast((await res.json().catch(() => ({}))).error || 'Could not sync that tick'); } // 4xx: will never succeed, drop it
      saveQueue(queue().filter(x => x.t !== t.t));
    }
  } finally {
    flushing = false; emitStatus();
    if (!queue().length && status.kind !== 'offline' && status.kind !== 'auth') refresh({ fresh: true });
  }
}
