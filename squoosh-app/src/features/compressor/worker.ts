import * as Comlink from 'comlink';
import { decodeImage } from './image-decoder';
import { defaultMozjpegOptions, loadMozjpeg } from './mozjpeg';
import type { Compressor, EncodeOptions, ResizeOptions } from './types';

const api: Compressor = {
  async decode(file) {
    return decodeImage(file);
  },
  async encode(
    data,
    width,
    height,
    options: EncodeOptions,
    _resize: ResizeOptions = { enabled: false }
  ) {
    const module = await loadMozjpeg();
    // Map our flat encode options onto the field shape that mozjpeg's
    // WASM actually reads. We pin `color_space` to YCbCr (3); libjpeg
    // handles the chroma collapse path from there.
    const mozjpegOptions = {
      ...defaultMozjpegOptions,
      quality: options.quality,
      progressive: options.progressive,
      optimize_coding: options.optimize_coding,
      smoothing: options.smoothing,
      quant_table: options.quant_table,
      trellis_multipass: options.trellis_multipass,
      trellis_opt_zero: options.trellis_opt_zero,
      trellis_opt_table: options.trellis_opt_table,
      trellis_loops: options.trellis_loops,
      auto_subsample: options.auto_subsample,
      chroma_subsample: options.chroma_subsample,
      color_space: 3,
    };
    const bytes = module.encode(data, width, height, mozjpegOptions);
    // Copy into a fresh ArrayBuffer so we can transfer it cleanly
    // across the Comlink boundary without exposing the WASM heap.
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return {
      bytes: buffer,
      mime: 'image/jpeg',
      extension: 'jpg',
    };
  },
};

Comlink.expose(api);
