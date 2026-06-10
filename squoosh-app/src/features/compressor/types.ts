import type { DecodedImage, EncodedImage } from '../../lib/types';

export interface EncodeOptions {
  quality: number;
}

export interface Compressor {
  decode(file: File): Promise<DecodedImage>;
  encode(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    options: EncodeOptions
  ): Promise<EncodedImage>;
}
