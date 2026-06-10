import * as Comlink from 'comlink';
import type { Compressor } from './types';

// Returns a Comlink-wrapped proxy to a fresh Web Worker that owns the
// mozjpeg WASM instance. Callers should release the proxy when they're
// done so the worker can be torn down.
export function createCompressor(): Comlink.Remote<Compressor> {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
    name: 'pixshrink-compressor',
  });
  return Comlink.wrap<Compressor>(worker);
}
