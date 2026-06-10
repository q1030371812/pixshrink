export type ItemStatus = 'decoding' | 'ready' | 'encoding' | 'done' | 'error';

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

export interface CompressionItem {
  id: string;
  name: string;
  size: number;
  file: File;
  status: ItemStatus;
  quality: number;
  width?: number;
  height?: number;
  decoded?: DecodedImage;
  output?: EncodedImage;
  error?: string;
}
