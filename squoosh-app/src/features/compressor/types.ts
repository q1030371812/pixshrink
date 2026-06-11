import type {
  DecodedImage,
  EncodedImage,
} from '../../lib/types';

// Mirrors the fields that Squoosh's `mozjpegEncode` actually reads from
// `options`. Field names match `defaultMozjpegOptions` 1:1.
export interface EncodeOptions {
  quality: number;
  progressive: boolean;
  optimize_coding: boolean;
  smoothing: number;
  color_space: number; // 1=GRAYSCALE, 2=RGB, 3=YCbCr
  quant_table: number; // 0..8
  trellis_multipass: boolean;
  trellis_opt_zero: boolean;
  trellis_opt_table: boolean;
  trellis_loops: number;
  auto_subsample: boolean;
  chroma_subsample: number; // 1, 2, or 3
}

// Resize pre-processing applied in the worker before the encode call.
// Resizing is opt-in; when `enabled` is false the input is forwarded
// unchanged. The UI does not currently surface resize \u2014 we keep the
// shape so the worker contract is forward-compatible, but the only
// value we actually pass today is `{ enabled: false }`.
export interface ResizeOptions {
  enabled: boolean;
}

export interface Compressor {
  decode(file: File): Promise<DecodedImage>;
  encode(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: EncodeOptions,
    resize?: ResizeOptions
  ): Promise<EncodedImage>;
}
