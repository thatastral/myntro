process.env.MOMENTUM_SOURCE = 'fixture';
process.env.MOMENTUM_PASSCODE = 'secret-pass';
import test from 'node:test';
import assert from 'node:assert/strict';
import { getState, tickHabit, _test } from '../api/_lib/build.js';
import { isAuthed, issueCookie, checkPasscode } from '../api/_lib/auth.js';

test('state has every section and a stable version', async () => {
  _test.reset();
  const a = await getState({ force: true }), b = await getState();
  for (const k of ['habits', 'todos', 'weeklyGoals', 'goals', 'money', 'career', 'tim']) assert.ok(a[k], k);
  assert.equal(a.version, b.version);
  assert.equal(a.habits.list.length, 10);
});
test('habits come from the schema: every checkbox is a habit, in your order', async () => {
  const { habits } = await getState();
  assert.equal(habits.list[0].key, 'Morning devotional');
  assert.deepEqual(habits.list.filter(h => h.writable).map(h => h.key).sort(), ['Hydrate 1.5L', 'Workout']);
});
test('only whitelisted habits can be written, and rows must exist', async () => {
  const { today } = await getState();
  await assert.rejects(() => tickHabit({ habit: 'Journal', date: today, value: true }), /read-only/);
  await assert.rejects(() => tickHabit({ habit: 'Workout', date: '2030-01-01', value: true }), /No habit row/);
  await assert.rejects(() => tickHabit({ habit: 'Workout', date: 'nope', value: true }), /bad date/);
});
test('a tick shows up in the very next read and bumps the version', async () => {
  const before = await getState({ force: true });
  const row = before.habits.days.find(d => d.date === before.today);
  const target = !row.done['Hydrate 1.5L'];
  await tickHabit({ habit: 'Hydrate 1.5L', date: before.today, value: target });
  const after = await getState();
  assert.equal(after.habits.days.find(d => d.date === after.today).done['Hydrate 1.5L'], target);
  assert.notEqual(after.version, before.version);
  await tickHabit({ habit: 'Hydrate 1.5L', date: before.today, value: !target }); // restore
});
test('auth: cookie verifies, tampering and missing passcode do not', () => {
  const cookie = issueCookie().split(';')[0];
  assert.equal(isAuthed({ headers: { cookie } }), true);
  assert.equal(isAuthed({ headers: { cookie: cookie.slice(0, -2) + 'xx' } }), false);
  assert.equal(isAuthed({ headers: {} }), false);
  assert.equal(checkPasscode({ headers: {}, socket: { remoteAddress: '1.1.1.1' } }, 'secret-pass').ok, true);
  assert.equal(checkPasscode({ headers: {}, socket: { remoteAddress: '2.2.2.2' } }, 'wrong').ok, false);
});
test('lockout after repeated wrong passcodes', () => {
  const req = { headers: {}, socket: { remoteAddress: '9.9.9.9' } };
  for (let i = 0; i < 5; i++) checkPasscode(req, 'bad');
  const r = checkPasscode(req, 'secret-pass');
  assert.equal(r.ok, false);
  assert.ok(r.locked > 0);
});
