// Generates a single self-contained static-preview.html that can be opened
// directly from the file system (no server, no npm install). It inlines the
// mozpeg encoder JS and WASM, then loads the encoder from a Blob URL.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const templatePath = join(root, 'scripts', 'static-template.html');
const wasmPath = join(root, 'public', 'codecs', 'mozjpeg', 'enc', 'mozjpeg_enc.wasm');
const encJsPath = join(root, 'src', 'codecs', 'mozjpeg', 'enc', 'mozjpeg_enc.js');
const outPath = join(root, 'static-preview.html');

let template = readFileSync(templatePath, 'utf-8');
const wasmBytes = readFileSync(wasmPath);
const wasmB64 = wasmBytes.toString('base64');
const encJs = readFileSync(encJsPath, 'utf-8');

if (!template.includes('__WASM_B64__')) {
  throw new Error('Template is missing __WASM_B64__ placeholder.');
}
if (!template.includes('__ENC_JS__')) {
  throw new Error('Template is missing __ENC_JS__ placeholder.');
}

template = template.split('__WASM_B64__').join(wasmB64);
template = template.split('__ENC_JS__').join(encJs);

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, template);

const sizeKb = (template.length / 1024).toFixed(1);
console.log(`Wrote ${outPath} (${sizeKb} KB)`);
