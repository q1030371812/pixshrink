import { useCallback, useEffect, useRef, useState } from 'react';
import * as Comlink from 'comlink';
import { TopBar } from './components/TopBar';
import { PrivacyBadge } from './components/PrivacyBadge';
import { DropZone } from './components/DropZone';
import { ResultPanel } from './components/ResultPanel';
import { createCompressor } from './features/compressor/client';
import type { Compressor } from './features/compressor/types';
import type { CompressionItem, EncodedImage } from './lib/types';
import { useTheme } from './lib/theme';

function makeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function friendlyError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unexpected error during compression.';
}

export default function App() {
  const [theme, toggleTheme] = useTheme();
  const [item, setItem] = useState<CompressionItem | null>(null);
  const compressorRef = useRef<Comlink.Remote<Compressor> | null>(null);
  const [compressorReady, setCompressorReady] = useState(false);

  // Spawn the worker once. The first encode pays the WASM-load tax; subsequent
  // re-encodes reuse the same module.
  useEffect(() => {
    const remote = createCompressor();
    compressorRef.current = remote;
    setCompressorReady(true);
    return () => {
      void Comlink.releaseProxy(remote);
      compressorRef.current = null;
    };
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<CompressionItem>) => {
      setItem((prev) => (prev && prev.id === id ? { ...prev, ...patch } : prev));
    },
    []
  );

  const runEncode = useCallback(
    async (
      id: string,
      data: Uint8ClampedArray,
      width: number,
      height: number,
      quality: number
    ): Promise<EncodedImage | null> => {
      const remote = compressorRef.current;
      if (!remote) return null;
      updateItem(id, { status: 'encoding', quality });
      try {
        return await remote.encode(data, width, height, { quality });
      } catch (err) {
        updateItem(id, { status: 'error', error: friendlyError(err) });
        return null;
      }
    },
    [updateItem]
  );

  const handleFile = useCallback(
    async (file: File) => {
      const remote = compressorRef.current;
      if (!remote) return;
      const id = makeId();
      const next: CompressionItem = {
        id,
        name: file.name || 'image',
        size: file.size,
        file,
        status: 'decoding',
        quality: 75,
      };
      setItem(next);
      try {
        const decoded = await remote.decode(file);
        updateItem(id, {
          status: 'ready',
          width: decoded.width,
          height: decoded.height,
          decoded,
        });
        const encoded = await runEncode(id, decoded.data, decoded.width, decoded.height, 75);
        if (encoded) {
          updateItem(id, { status: 'done', output: encoded });
        }
      } catch (err) {
        updateItem(id, { status: 'error', error: friendlyError(err) });
      }
    },
    [runEncode, updateItem]
  );

  const handleQualityChange = useCallback(
    async (quality: number) => {
      const current = item;
      if (!current || !current.decoded) return;
      const encoded = await runEncode(
        current.id,
        current.decoded.data,
        current.decoded.width,
        current.decoded.height,
        quality
      );
      if (encoded) {
        updateItem(current.id, { status: 'done', output: encoded, quality });
      }
    },
    [item, runEncode, updateItem]
  );

  const handleReset = useCallback(() => setItem(null), []);

  return (
    <div className="flex h-full flex-col">
      <TopBar theme={theme} onToggleTheme={toggleTheme} />
      <PrivacyBadge />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          {item ? (
            <ResultPanel
              item={item}
              onQualityChange={handleQualityChange}
              onReset={handleReset}
            />
          ) : (
            <DropZone onFile={handleFile} disabled={!compressorReady} />
          )}
        </div>
      </main>
    </div>
  );
}
