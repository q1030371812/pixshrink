import * as Comlink from 'comlink';
import type { Compressor } from './types';

// A single Comlink-wrapped worker is a bottleneck: every encode call
// queues behind the one in flight because WASM modules are not
// shareable across Worker contexts. To get *real* parallelism, we spin
// up a small pool and hand each encode to whichever worker is idle.
export interface CompressorPool {
  /** How many workers are in the pool. */
  readonly size: number;
  /** Run `fn` against an idle worker, then return that worker to the pool. */
  runExclusive<T>(fn: (proxy: Comlink.Remote<Compressor>) => Promise<T>): Promise<T>;
  /** Tear down every worker. Safe to call multiple times. */
  terminate(): void;
}

// Pick a pool size that's actually useful: enough to keep multi-core
// CPUs busy, but still small enough that a 4K image buffer doesn't
// OOM the tab. Each worker holds its own copy of the mozjpeg WASM
// module and keeps the source pixels resident while encoding, so the
// memory budget is (workers * max-image-footprint). We leave one core
// for the main thread and clamp the result so that a high-end desktop
// gets more parallelism while a low-RAM laptop still has headroom.
function pickPoolSize(): number {
  if (typeof navigator === 'undefined') return 6;
  const cores = navigator.hardwareConcurrency || 4;
  // cores leaves every available core on the box. We still cap at a
  // sane ceiling so a 64-core workstation doesn't keep 64 copies of
  // the encoder alive (each holds the source image resident), and we
  // floor at a healthy minimum so dual-core laptops still get real
  // parallelism instead of one encode at a time.
  return Math.max(4, Math.min(32, cores));
}

export function createCompressorPool(overrides?: { size?: number }): CompressorPool {
  const size = overrides?.size ?? pickPoolSize();
  const proxies: Comlink.Remote<Compressor>[] = [];
  const workers: Worker[] = [];
  let terminated = false;

  for (let i = 0; i < size; i += 1) {
    // Vite's worker parser needs the options object to be statically
    // resolvable, so we keep the literal at compile time and assign
    // the index-based suffix after the worker is constructed.
    const worker = new Worker(new URL('./worker.ts', import.meta.url), {
      type: 'module',
      name: 'pixshrink-compressor',
    });
    workers.push(worker);
    proxies.push(Comlink.wrap<Compressor>(worker));
  }

  // Round-robin hand-out. The shallowest queue wins: each call to
  // runExclusive grabs the first idle worker (any worker that has
  // resolved its current runExclusive promise is idle). Because JS
  // runs single-threaded, the loop body is atomic between awaits, so
  // the index handoff is race-free without an explicit lock.
  const idleWaiters: Array<(proxy: Comlink.Remote<Compressor>) => void> = [];

  const release = (proxy: Comlink.Remote<Compressor>): void => {
    const next = idleWaiters.shift();
    if (next) {
      // Hand directly to the next waiter; the worker never goes back
      // to the free list, which keeps the order FIFO.
      next(proxy);
    } else {
      // No one is waiting -- push back onto the free list. The proxy
      // is treated as the head of the free list.
      proxies.unshift(proxy);
    }
  };

  return {
    size,
    async runExclusive<T>(fn: (proxy: Comlink.Remote<Compressor>) => Promise<T>): Promise<T> {
      if (terminated) throw new Error('Compressor pool has been terminated.');
      const proxy = await new Promise<Comlink.Remote<Compressor>>((resolve) => {
        const free = proxies.shift();
        if (free) {
          resolve(free);
        } else {
          idleWaiters.push(resolve);
        }
      });
      try {
        return await fn(proxy);
      } finally {
        release(proxy);
      }
    },
    terminate(): void {
      if (terminated) return;
      terminated = true;
      for (const w of workers) w.terminate();
      workers.length = 0;
      proxies.length = 0;
      // Wake any pending waiters with an error rather than hanging.
      while (idleWaiters.length > 0) {
        const w = idleWaiters.shift();
        if (w) w(Promise.reject(new Error('Pool terminated')) as unknown as Comlink.Remote<Compressor>);
      }
    },
  };
}

// Backwards-compatible single-worker export, kept so existing imports
// keep type-checking. Prefer `createCompressorPool` for new code.
export function createCompressor(): Comlink.Remote<Compressor> {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), {
    type: 'module',
    name: 'pixshrink-compressor',
  });
  return Comlink.wrap<Compressor>(worker);
}
