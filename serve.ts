// Cover Coast — tiny static server for local testing only. Serves app/ at
// http://localhost:8080 so the app runs exactly as a static host serves it.
// Usage: node serve.ts [port]
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('./app', import.meta.url));
const port = Number(process.argv[2] ?? 8080);
const types = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ttf': 'font/ttf',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
};

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = join(root, path === '/' ? 'index.html' : path);
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    const data = await readFile(file);
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end('not found');
  }
}).listen(port, () => console.log(`Cover Coast at http://localhost:${port}`));
