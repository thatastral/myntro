// Local dev: serves the static app and routes /api/* to the same handlers Vercel runs.
//   npm run dev        -> demo data, passcode "demo"
//   npm run dev:live   -> real Notion (needs NOTION_TOKEN + MOMENTUM_PASSCODE)
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const port = +process.env.PORT || 8000;

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^a-z0-9-]/gi, '');
      const mod = await import(pathToFileURL(join(root, 'api', name + '.js')).href).catch(() => null);
      if (!mod) { res.statusCode = 404; return res.end('{"error":"not found"}'); }
      return await mod.default(req, res);
    }
    let p = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
    if (p === '/' || p === '\\') p = '/index.html';
    const file = await readFile(join(root, p));
    res.setHeader('Content-Type', types[extname(p)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(file);
  } catch {
    res.statusCode = 404; res.end('Not found');
  }
}).listen(port, () => console.log(`Momentum dev server: http://localhost:${port}  (source: ${process.env.MOMENTUM_SOURCE || 'notion'})`));
