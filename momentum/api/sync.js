// POST /api/sync — push local changes, pull everything newer than `since`.
// Storage: libSQL (Turso in production, a local file in development).
// Auth: single-user passphrase in the MOMENTUM_KEY env var, sent as x-momentum-key.
import { createClient } from '@libsql/client';
import { createHash, timingSafeEqual } from 'node:crypto';

const STORES = new Set(['profile', 'weights', 'activities', 'goals']);
const MAX_CHANGES = 500, MAX_DATA = 20000, PULL_LIMIT = 5000;

let client, ready;
const getDb = () => (client ||= createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
}));
const init = () => (ready ||= getDb().batch([
  `CREATE TABLE IF NOT EXISTS records (
     store TEXT NOT NULL, id TEXT NOT NULL, data TEXT,
     updated_at INTEGER NOT NULL, deleted INTEGER NOT NULL DEFAULT 0, rev INTEGER NOT NULL,
     PRIMARY KEY (store, id))`,
  `CREATE INDEX IF NOT EXISTS records_rev ON records (rev)`,
], 'write').catch(e => { ready = null; throw e; }));

const sha = s => createHash('sha256').update(String(s)).digest();
const authorised = req => {
  const want = process.env.MOMENTUM_KEY;
  return !!want && timingSafeEqual(sha(req.headers['x-momentum-key'] || ''), sha(want));
};
const send = (res, code, body) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(body)); };

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = '';
  for await (const c of req) { raw += c; if (raw.length > 2_000_000) throw new Error('too large'); }
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  if (!process.env.MOMENTUM_KEY) return send(res, 503, { error: 'Server has no MOMENTUM_KEY set' });
  if (!authorised(req)) return send(res, 401, { error: 'Wrong passphrase' });
  try {
    const body = await readBody(req);
    const since = Number.isFinite(+body.since) ? +body.since : 0;
    const changes = Array.isArray(body.changes) ? body.changes.slice(0, MAX_CHANGES) : [];
    await init();
    const db = getDb();
    const stmts = [];
    for (const c of changes) {
      if (!c || !STORES.has(c.store) || typeof c.id !== 'string' || c.id.length > 64 || !Number.isFinite(+c.updatedAt)) continue;
      const deleted = c.deleted ? 1 : 0;
      const data = deleted ? null : JSON.stringify(c.data ?? {});
      if (data && data.length > MAX_DATA) continue;
      stmts.push({
        sql: `INSERT INTO records (store, id, data, updated_at, deleted, rev)
              VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(rev), 0) + 1 FROM records))
              ON CONFLICT (store, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at,
                deleted = excluded.deleted, rev = excluded.rev
              WHERE excluded.updated_at > records.updated_at`,
        args: [c.store, c.id, data, Math.round(+c.updatedAt), deleted],
      });
    }
    if (stmts.length) await db.batch(stmts, 'write');
    const rows = (await db.execute({ sql: 'SELECT store, id, data, updated_at, deleted, rev FROM records WHERE rev > ? ORDER BY rev LIMIT ?', args: [since, PULL_LIMIT] })).rows;
    const records = rows.map(r => ({ store: r.store, id: r.id, data: r.data ? JSON.parse(r.data) : null, updatedAt: Number(r.updated_at), deleted: !!r.deleted, rev: Number(r.rev) }));
    const rev = records.length ? records[records.length - 1].rev : since;
    send(res, 200, { records, rev, more: records.length === PULL_LIMIT });
  } catch (e) {
    console.error(e);
    send(res, 500, { error: 'Database error' });
  }
}
