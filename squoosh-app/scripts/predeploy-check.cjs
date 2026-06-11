#!/usr/bin/env node
// Pre-deploy self-check for Pixshrink. Verifies the dist/ tree and the
// Cloudflare-specific config files. Exits non-zero on any problem so
// it can be wired into CI.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const fail = (msg) => { console.error('\u2717 ' + msg); process.exitCode = 1; };
const pass = (msg) => console.log('\u2713 ' + msg);

// 1. dist/ exists and is non-empty
const dist = path.join(root, 'dist');
if (!fs.existsSync(dist)) fail('dist/ does not exist \u2014 run `npm run build`');
else pass('dist/ exists');

// 2. Cloudflare config files
for (const f of ['wrangler.jsonc', 'public/_redirects', 'public/_headers']) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) fail(`${f} missing`);
  else pass(`${f} present`);
}

// 3. Critical assets in dist/
const required = [
  'dist/index.html',
  'dist/codecs/mozjpeg/enc/mozjpeg_enc.wasm',
];
for (const f of required) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) fail(`${f} missing in dist/`);
  else {
    const sz = fs.statSync(p).size;
    if (sz < 100) fail(`${f} is suspiciously small (${sz} bytes)`);
    else pass(`${f} (${(sz/1024).toFixed(1)} KB)`);
  }
}

// 4. Sanity-check the bundles reference the mozjpeg codec (it is
//    loaded by the worker at runtime, so we look at every bundle).
const assets = path.join(dist, 'assets');
if (fs.existsSync(assets)) {
  const js = fs.readdirSync(assets).filter(f => f.endsWith('.js'));
  if (js.length === 0) {
    fail('no JS bundle in dist/assets/');
  } else {
    let found = null;
    for (const f of js) {
      const buf = fs.readFileSync(path.join(assets, f), 'utf8');
      // Match mozjpeg OR codecs/mozjpeg/enc - the worker minifier
      // sometimes inlines the locateFile path.
      if (/mozjpeg/.test(buf) || /codecs\/mozjpeg/.test(buf)) {
        pass(`bundle ${f} references the mozjpeg encoder`);
        found = f;
        break;
      }
    }
    if (!found) {
      fail('no bundle in dist/assets/ references mozjpeg');
    }
  }
}

// 5. WASM size sanity
const wasmPath = path.join(dist, 'codecs/mozjpeg/enc/mozjpeg_enc.wasm');
if (fs.existsSync(wasmPath)) {
  const sz = fs.statSync(wasmPath).size;
  if (sz > 400 * 1024) fail(`wasm size ${sz} > 400 KB \u2014 unexpected`);
  else pass(`wasm size sane (${(sz/1024).toFixed(1)} KB)`);
}

if (process.exitCode) {
  console.error('\nSelf-check FAILED. Fix the issues above before deploying.');
} else {
  console.log('\nSelf-check PASSED. Safe to deploy.');
}
