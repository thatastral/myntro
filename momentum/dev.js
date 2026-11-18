// Local dev server: static files + /api/sync (file-backed libSQL). Usage: MOMENTUM_KEY=secret node dev.js
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import sync from './api/sync.js';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
http.createServer(async (req, res) => {
  const p = new URL(req.url, 'http://x').pathname;
  if (p === '/api/sync') return sync(req, res);
  const file = normalize(join(root, p === '/' ? 'index.html' : p));
  if (!file.startsWith(root) || /\/(api|node_modules)\/|local\.db|package/.test(file)) { res.statusCode = 404; return res.end(); }
  try { const b = await readFile(file); res.setHeader('content-type', types[extname(file)] || 'application/octet-stream'); res.end(b); }
  catch { res.statusCode = 404; res.end('not found'); }
}).listen(+process.env.PORT || 8000, () => console.log('http://localhost:' + (process.env.PORT || 8000)));
