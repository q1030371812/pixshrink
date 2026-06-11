export type ItemStatus = 'idle' | 'processing' | 'done' | 'error';

export interface DecodedImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface EncodedImage {
  bytes: ArrayBuffer;
  mime: string;
  extension: string;
}

// User-facing batch settings. We deliberately keep this to a single
// Quality knob -- the user just wants the file smaller, not a trip into
// JPEG internals. The rest of the encoder is pinned to its defaults in
// `features/compressor/mozjpeg.ts` (progressive, optimize_coding, etc.).
export interface BatchSettings {
  quality: number;
}

export const defaultBatchSettings: BatchSettings = {
  quality: 75,
};

export interface CompressionItem {
  id: string;
  name: string;
  size: number;
  file: File;
  status: ItemStatus;
  // Original image dimensions, populated as soon as the file is decoded.
  width?: number;
  height?: number;
  // The decoded RGBA buffer. Held in memory for the lifetime of the item so
  // re-running the batch with new settings does not have to re-decode.
  decoded?: DecodedImage;
  output?: EncodedImage;
  error?: string;
}
