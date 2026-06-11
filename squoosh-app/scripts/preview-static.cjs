const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(process.env.PIX_DIST || 'dist');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.ico':  'image/x-icon',
  '.txt':  'text/plain; charset=utf-8',
};
function send(res, code, body, type='text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
http.createServer((req, res) => {
  let p = (req.url || '/').split('?')[0].split('#')[0];
  if (p.endsWith('/')) p += 'index.html';
  let target = path.join(root, decodeURIComponent(p));
  if (!target.startsWith(root)) return send(res, 403, 'forbidden');
  fs.stat(target, (err, st) => {
    if (err || !st.isFile()) {
      // SPA fallback
      const html = path.join(root, 'index.html');
      return fs.readFile(html, (e, buf) => {
        if (e) return send(res, 404, 'not found');
        res.writeHead(200, { 'Content-Type': mime['.html'] });
        res.end(buf);
      });
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream', 'Content-Length': st.size });
    fs.createReadStream(target).pipe(res);
  });
}).listen(parseInt(process.env.PIX_PORT || '4174', 10), '127.0.0.1', () => {
  console.log('pixshrink static server listening on http://127.0.0.1:' + (process.env.PIX_PORT || '4174'));
});