// MoJS loader. The default export from the Emscripten module is a factory
// function that returns a Promise which resolves to the runtime Module.
import mozjpegFactory from '../../codecs/mozjpeg/enc/mozjpeg_enc';
import type { BatchSettings } from '../../lib/types';
import type { EncodeOptions } from './types';

export interface MozjpegModule {
  encode(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: Record<string, unknown>
  ): Uint8Array;
}

let modulePromise: Promise<MozjpegModule> | null = null;

// Resolve the WASM URL inside the worker. Vite's `base: './'` config
// bakes `import.meta.env.BASE_URL` into a string at build time, so we
// cannot rely on it here -- the worker is loaded from
// `/assets/worker-XXXX.js` and a `./codecs/...` base would resolve
// against the worker's URL, sending the fetch to
// `/assets/codecs/...` which does not exist. We compute an absolute
// URL from the worker's own location instead.
function resolveWasmBase(): string {
  // `self` here is the worker's global scope -- this module is only
  // ever imported from `worker.ts`, so it always runs inside a worker.
  const workerUrl = self.location.href;
  // The worker bundle lives at `<host>/assets/worker-XXXX.js`; the
  // WASM lives at `<host>/codecs/mozjpeg/enc/mozjpeg_enc.wasm`. From
  // the worker's directory that is two segments up, regardless of
  // whether the site is hosted at the root, a subpath, or a `file://`
  // origin.
  const dir = workerUrl.substring(0, workerUrl.lastIndexOf('/') + 1);
  return new URL('../../codecs/mozjpeg/enc/', dir).href;
}

export function loadMozjpeg(): Promise<MozjpegModule> {
  if (modulePromise) return modulePromise;
  modulePromise = mozjpegFactory({
    noInitialRun: true,
    locateFile: (path: string) => `${resolveWasmBase()}${path}`,
  });
  return modulePromise;
}

export const defaultMozjpegOptions = {
  quality: 75,
  baseline: false,
  arithmetic: false,
  progressive: true,
  optimize_coding: true,
  smoothing: 0,
  color_space: 3, // YCbCr
  quant_table: 3,
  trellis_multipass: false,
  trellis_opt_zero: false,
  trellis_opt_table: false,
  trellis_loops: 1,
  auto_subsample: true,
  chroma_subsample: 2,
  separate_chroma_quality: false,
  chroma_quality: 75,
};

// Map the user-facing `BatchSettings` onto the flat option object that
// mozjpeg's WASM encoder actually reads. The UI only exposes Quality now;
// the rest of the encoder is pinned to its sensible defaults so the user
// gets a smaller JPEG without having to learn JPEG knobs.
export function toMozjpegOptions(settings: BatchSettings): EncodeOptions {
  return {
    ...defaultMozjpegOptions,
    quality: settings.quality,
  };
}
