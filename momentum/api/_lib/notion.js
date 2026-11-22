import { httpError } from './http.js';
import { config } from './config.js';

const BASE = 'https://api.notion.com/v1';
const VERSION = '2025-09-03'; // data-source API
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function call(method, path, body, attempt = 0) {
  const token = process.env.NOTION_TOKEN;
  if (!token) throw httpError(500, 'NOTION_TOKEN is not set');
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': VERSION, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (res.status === 429 && attempt < 2) {
    await sleep(Math.min((+res.headers.get('retry-after') || 1) * 1000, 2000));
    return call(method, path, body, attempt + 1);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw httpError(res.status === 404 ? 404 : 502, `Notion ${res.status}: ${t.slice(0, 200)}`);
  }
  return res.json();
}

export const notion = {
  async queryAll(key, { filter, sorts, max = 300 } = {}) {
    const id = config.sources[key];
    const out = [];
    let cursor;
    do {
      const body = { page_size: 100, ...(filter && { filter }), ...(sorts && { sorts }), ...(cursor && { start_cursor: cursor }) };
      const r = await call('POST', `/data_sources/${id}/query`, body);
      out.push(...r.results);
      cursor = r.has_more ? r.next_cursor : null;
    } while (cursor && out.length < max);
    return out;
  },
  schema: key => call('GET', `/data_sources/${config.sources[key]}`),
  updatePage: (pageId, properties) => call('PATCH', `/pages/${pageId}`, { properties }),
};

// Read a Notion property value into a plain JS value.
export function val(p) {
  if (!p) return null;
  switch (p.type) {
    case 'title': return p.title.map(t => t.plain_text).join('');
    case 'rich_text': return p.rich_text.map(t => t.plain_text).join('');
    case 'checkbox': return !!p.checkbox;
    case 'select': return p.select?.name ?? null;
    case 'status': return p.status?.name ?? null;
    case 'multi_select': return p.multi_select.map(o => o.name);
    case 'number': return p.number;
    case 'date': return p.date?.start ?? null;
    case 'url': case 'email': case 'phone_number': return p[p.type];
    case 'relation': return p.relation.map(r => r.id);
    case 'rollup': return p.rollup?.type === 'array' ? null : p.rollup?.[p.rollup.type] ?? null;
    case 'formula': return p.formula?.[p.formula.type] ?? null;
    default: return null;
  }
}
