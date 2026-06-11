import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for the local-only image compressor.
// All processing happens in a Web Worker; we set worker format to ES modules
// so the mozjpeg WASM module can be loaded from /codecs/... at runtime.
export default defineConfig({
  plugins: [react()],
  // Relative base so the built `dist/` works no matter where it's
  // hosted (Cloudflare Pages subpath, GitHub Pages project page, etc.).
  base: './',
  worker: {
    format: 'es',
  },
  server: {
    port: 5173,
    strictPort: false,
    host: '127.0.0.1',
  },
  build: {
    target: 'es2022',
    // Keep the WASM file as a separate asset so the encoder can stream
    // it at runtime rather than being inlined into a base64 bundle.
    assetsInlineLimit: 0,
    sourcemap: false,
  },
  optimizeDeps: {
    // The mozjpeg Emscripten module ships its own JS and shouldn't be pre-bundled.
    exclude: ['src/codecs/mozjpeg/enc/mozjpeg_enc.js'],
  },
});
