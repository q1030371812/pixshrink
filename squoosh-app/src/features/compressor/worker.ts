import * as Comlink from 'comlink';
import { decodeImage } from './image-decoder';
import { defaultMozjpegOptions, loadMozjpeg } from './mozjpeg';
import type { Compressor, EncodeOptions } from './types';

const api: Compressor = {
  async decode(file) {
    return decodeImage(file);
  },
  async encode(data, width, height, options: EncodeOptions) {
    const module = await loadMozjpeg();
    const bytes = module.encode(data, width, height, {
      ...defaultMozjpegOptions,
      quality: options.quality,
    });
    // Copy into a fresh ArrayBuffer so we can transfer it cleanly across
    // the Comlink boundary without exposing the underlying WASM heap.
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
