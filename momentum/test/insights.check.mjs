import test from 'node:test';
import assert from 'node:assert/strict';
import { habitStats, goalPace, dayScore, analyze } from '../js/insights.js';

const mk = (done, today = '2026-11-22') => {
  const days = Object.entries(done).map(([date, v]) => ({ id: date, date, done: { Reading: v } }));
  return { today, weekStart: '2026-11-16', cycle: { start: '2026-10-04', end: '2026-12-31' },
    habits: { list: [{ key: 'Reading', label: 'Reading', icon: 'book', group: 'Learning', writable: false }], days }, todos: [], links: [] };
};

test('streak is not broken by a still-pending today', () => {
  const s = habitStats(mk({ '2026-11-19': true, '2026-11-20': true, '2026-11-21': true, '2026-11-22': false }));
  assert.equal(s.Reading.streak, 3);
  assert.equal(s.Reading.doneToday, false);
});
test('streak includes today once ticked, and a gap resets it', () => {
  const s = habitStats(mk({ '2026-11-18': true, '2026-11-19': false, '2026-11-20': true, '2026-11-21': true, '2026-11-22': true }));
  assert.equal(s.Reading.streak, 3);
  assert.equal(s.Reading.best, 3);
});
test('days-since counts back to last tick', () => {
  const s = habitStats(mk({ '2026-11-17': true, '2026-11-18': false, '2026-11-19': false, '2026-11-20': false, '2026-11-21': false, '2026-11-22': false }));
  assert.equal(s.Reading.since, 5);
});

const st = (over = {}) => ({ today: '2026-11-22', cycle: { start: '2026-10-04', end: '2026-12-31' }, habits: { days: [] }, links: [], ...over });
test('goal pace: ahead / behind / at risk by deadline pressure', () => {
  // cycle day 50 of 88 => ~57% elapsed
  const g = (current, extra = {}) => goalPace(st(), { title: 'Read', current, target: 100, logged: 0, ...extra }, {});
  assert.equal(g(80).status, 'ahead');
  assert.equal(g(55).status, 'on-track');
  assert.equal(g(40).status, 'behind');
  assert.equal(g(5).status, 'at-risk');
  assert.equal(g(70, { deadline: '2026-11-28' }).status, 'at-risk'); // deadline in 6 days and under 80%
  assert.equal(g(100).status, 'done');
});
test('binary goals are not judged on linear pace', () => {
  const p = goalPace(st(), { title: 'Land the role', current: 0, target: 1, logged: 0 }, {});
  assert.equal(p.status, 'open');
});
test('money logged entries add on top of current (never double counted)', () => {
  const p = goalPace(st(), { title: 'Fund (NGN)', current: 11000, logged: 96000, target: 500000, deadline: '2026-11-30' }, {});
  assert.equal(p.total, 107000);
  assert.equal(p.currency, 'NGN');
  assert.equal(p.status, 'at-risk');
  assert.ok(p.perDay > 40000);
});
test('habit-linked goals follow live ticks instead of waiting for Sunday', () => {
  const days = ['2026-10-05', '2026-10-06', '2026-10-07'].map(date => ({ date, done: { Workout: true } }));
  const state = st({ habits: { days, list: [{ key: 'Workout' }] }, links: [{ match: 'workout', habit: 'Workout' }] });
  const p = goalPace(state, { title: 'Workouts completed', current: 1, target: 52, logged: 0 }, { Workout: {} });
  assert.equal(p.total, 3);
  assert.equal(p.live, true);
});

test('day score averages habits and tasks; future days are null', () => {
  const state = { ...mk({ '2026-11-22': true }), todos: [{ date: '2026-11-22', status: 'Done' }, { date: '2026-11-22', status: 'Not started' }] };
  assert.equal(dayScore(state, '2026-11-22').pct, (1 + 0.5) / 2);
  assert.equal(dayScore(state, '2026-11-23').pct, null);
});

test('analyze: attack-first is the earliest open Must Finish; closed tasks are skipped', () => {
  const state = { ...mk({ '2026-11-22': false }), todos: [
    { id: 'a', title: 'Maint', slot: 'Maintenance', time: '06:00-07:00', date: '2026-11-22', status: 'Not started' },
    { id: 'b', title: 'Late must', slot: 'Must Finish', time: '21:00-22:00', date: '2026-11-22', status: 'Not started' },
    { id: 'c', title: 'Early must', slot: 'Must Finish', time: '07:00-08:00', date: '2026-11-22', status: 'Not started' },
    { id: 'd', title: 'Done must', slot: 'Must Finish', time: '05:00-06:00', date: '2026-11-22', status: 'Done' },
  ], weeklyGoals: [], goals: [], career: [] };
  const a = analyze(state, new Date('2026-11-22T10:00:00'));
  assert.equal(a.today.attack.title, 'Early must');
  assert.deepEqual(a.today.next.map(t => t.title), ['Late must', 'Maint']);
});
