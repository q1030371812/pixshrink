// MoJS loader. The default export from the Emscripten module is a factory
// function that returns a Promise which resolves to the runtime Module.
import mozjpegFactory from '../../codecs/mozjpeg/enc/mozjpeg_enc';

export interface MozjpegModule {
  encode(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: Record<string, unknown>
  ): Uint8Array;
}

let modulePromise: Promise<MozjpegModule> | null = null;

export function loadMozjpeg(): Promise<MozjpegModule> {
  if (modulePromise) return modulePromise;
  const base = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
  const factory = mozjpegFactory as unknown as (
    opts: Record<string, unknown>
  ) => Promise<MozjpegModule>;
  modulePromise = factory({
    noInitialRun: true,
    locateFile: (path: string) => `${base}codecs/mozjpeg/enc/${path}`,
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
