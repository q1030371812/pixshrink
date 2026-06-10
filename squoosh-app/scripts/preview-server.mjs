 // Tiny static file server for previewing the self-contained static-preview.html.
 // Usage:  node scripts/preview-server.mjs [port]
 import { createServer } from 'node:http';
 import { readFile, stat } from 'node:fs/promises';
 import { extname, join, normalize, resolve, sep } from 'node:path';
 import { fileURLToPath } from 'node:url';

 const __dirname = fileURLToPath(new URL('.', import.meta.url));
 const ROOT = resolve(__dirname, '..');
 const PORT = Number(process.argv[2] || process.env.PORT || 4173);
 const HOST = process.env.HOST || '127.0.0.1';

 const MIME = {
   '.html': 'text/html; charset=utf-8',
   '.js':   'text/javascript; charset=utf-8',
   '.mjs':  'text/javascript; charset=utf-8',
   '.css':  'text/css; charset=utf-8',
   '.json': 'application/json; charset=utf-8',
   '.svg':  'image/svg+xml',
   '.png':  'image/png',
   '.jpg':  'image/jpeg',
   '.jpeg': 'image/jpeg',
   '.gif':  'image/gif',
   '.webp': 'image/webp',
   '.avif': 'image/avif',
   '.wasm': 'application/wasm',
   '.ico':  'image/x-icon',
   '.map':  'application/json; charset=utf-8',
 };

 function safeJoin(root, urlPath) {
   const decoded = decodeURIComponent(urlPath.split('?')[0]);
   const target = normalize(join(root, decoded));
   if (target !== root && !target.startsWith(root + sep)) return null;
   return target;
 }

 const server = createServer(async (req, res) => {
   try {
     let urlPath = req.url || '/';
     if (urlPath === '/' || urlPath === '') urlPath = '/static-preview.html';
     const target = safeJoin(ROOT, urlPath);
     if (!target) {
       res.writeHead(403); res.end('Forbidden'); return;
     }
     const s = await stat(target).catch(() => null);
     if (!s || !s.isFile()) {
       res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
       res.end('Not found: ' + urlPath);
       return;
     }
     const buf = await readFile(target);
     const type = MIME[extname(target).toLowerCase()] || 'application/octet-stream';
     res.writeHead(200, {
       'content-type': type,
       'content-length': buf.length,
       'cache-control': 'no-store',
       'cross-origin-opener-policy': 'same-origin',
       'cross-origin-embedder-policy': 'require-corp',
     });
     res.end(buf);
   } catch (err) {
     res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
     res.end('Server error: ' + (err && err.message));
   }
 });

 server.listen(PORT, HOST, () => {
   console.log(`Pixshrink preview server`);
   console.log(`  root:  ${ROOT}`);
   console.log(`  open:  http://${HOST}:${PORT}/static-preview.html`);
 });
