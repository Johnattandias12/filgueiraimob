import React, { useState, useCallback, useRef } from 'react';
import {
  Wand2, Download, Share2, RotateCcw, ChevronDown, ChevronUp,
  Layers, ImageIcon, Loader2, Check, Sparkles, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import UploadZone from '@/components/UploadZone';
import ThumbnailStrip from '@/components/ThumbnailStrip';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import EnhanceControls from '@/components/EnhanceControls';
import WatermarkControls from '@/components/WatermarkControls';
import LogoFilgueira from '@/components/LogoFilgueira';
import {
  EnhanceSettings, WatermarkSettings,
  DEFAULT_ENHANCE, REAL_ESTATE_MAGIC, DEFAULT_WATERMARK,
  processImage, dataURLtoBlob,
} from '@/lib/imageEngine';

interface ImageItem {
  id: string;
  file: File;
  originalSrc: string;
  processedSrc: string | null;
  name: string;
}

const Index: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enhance, setEnhance] = useState<EnhanceSettings>(DEFAULT_ENHANCE);
  const [watermark, setWatermark] = useState<WatermarkSettings>(DEFAULT_WATERMARK);
  const [showControls, setShowControls] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<number | null>(null);
  const addPhotosInputRef = useRef<HTMLInputElement>(null);

  const selected = images.find(i => i.id === selectedId) || null;

  const handleFilesSelected = useCallback((files: File[]) => {
    const newImages: ImageItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      originalSrc: URL.createObjectURL(file),
      processedSrc: null,
      name: file.name,
    }));
    setImages(prev => [...prev, ...newImages].slice(0, 15));
    setSelectedId(prev => prev || newImages[0]?.id || null);
    setShowControls(true);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setImages(prev => {
      const next = prev.filter(i => i.id !== id);
      return next;
    });
    setSelectedId(prev => {
      if (prev === id) {
        const remaining = images.filter(i => i.id !== id);
        return remaining[0]?.id || null;
      }
      return prev;
    });
  }, [images]);

  const handleProcessCurrent = useCallback(async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const result = await processImage(selected.originalSrc, enhance, watermark);
      setImages(prev => prev.map(i =>
        i.id === selected.id ? { ...i, processedSrc: result } : i
      ));
    } catch (e) {
      console.error('Processing failed:', e);
    }
    setProcessing(false);
  }, [selected, enhance, watermark]);

  const handleMagic = useCallback(async () => {
    setEnhance(REAL_ESTATE_MAGIC);
    if (!selected) return;
    setProcessing(true);
    try {
      const result = await processImage(selected.originalSrc, REAL_ESTATE_MAGIC, watermark);
      setImages(prev => prev.map(i =>
        i.id === selected.id ? { ...i, processedSrc: result } : i
      ));
    } catch (e) {
      console.error('Processing failed:', e);
    }
    setProcessing(false);
  }, [selected, watermark]);

  const handleReset = useCallback(() => {
    setEnhance(DEFAULT_ENHANCE);
    if (selected) {
      setImages(prev => prev.map(i =>
        i.id === selected.id ? { ...i, processedSrc: null } : i
      ));
    }
  }, [selected]);

  const handleBatchProcess = useCallback(async () => {
    setProcessing(true);
    setBatchProgress(0);
    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const result = await processImage(img.originalSrc, enhance, watermark);
        setImages(prev => prev.map(item =>
          item.id === img.id ? { ...item, processedSrc: result } : item
        ));
        setBatchProgress(Math.round(((i + 1) / images.length) * 100));
      }
    } catch (e) {
      console.error('Batch processing failed:', e);
    }
    setProcessing(false);
    setBatchProgress(null);
  }, [images, enhance, watermark]);

  const handleDownload = useCallback((item: ImageItem) => {
    const src = item.processedSrc || item.originalSrc;
    const a = document.createElement('a');
    a.href = src;
    a.download = `filgueira_${item.name}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const handleDownloadAll = useCallback(() => {
    const processed = images.filter(i => i.processedSrc);
    processed.forEach((img, index) => {
      setTimeout(() => handleDownload(img), index * 200);
    });
  }, [images, handleDownload]);

  const handleShare = useCallback(async (item: ImageItem) => {
    const src = item.processedSrc;
    if (!src) return;
    try {
      const blob = dataURLtoBlob(src);
      const file = new File([blob], `filgueira_${item.name}`, { type: 'image/jpeg' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Filgueira Imobiliária' });
      }
    } catch (e) {
      console.warn('Share failed:', e);
    }
  }, []);

  const processedCount = images.filter(i => i.processedSrc).length;
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <header className="glass-panel-sm sticky top-0 z-50 px-4 py-3 mx-2 mt-2 flex items-center justify-between">
        <LogoFilgueira />
        {images.length > 0 && (
          <span className="text-[11px] text-muted-foreground bg-secondary px-2 py-1 rounded-lg tabular-nums">
            {images.length}/15
          </span>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-2 gap-2 max-w-2xl mx-auto w-full pb-4">
        {images.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 animate-fade-in">
            <div className="text-center mb-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-1.5">Editor de Fotos</h2>
              <p className="text-muted-foreground text-sm max-w-[260px] mx-auto leading-relaxed">
                Aprimore suas fotos imobiliárias e adicione marca d'água em segundos
              </p>
            </div>
            <div className="w-full max-w-sm">
              <UploadZone onFilesSelected={handleFilesSelected} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 animate-fade-in">
            {/* Thumbnails + Add */}
            <div className="surface-card p-2">
              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-hidden">
                  <ThumbnailStrip
                    images={images.map(i => ({
                      id: i.id,
                      src: i.processedSrc || i.originalSrc,
                      name: i.name,
                      processed: !!i.processedSrc,
                    }))}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onRemove={handleRemove}
                  />
                </div>
                {images.length < 15 && (
                  <button
                    onClick={() => addPhotosInputRef.current?.click()}
                    className="flex-shrink-0 w-14 h-14 md:w-16 md:h-16 rounded-xl border-2 border-dashed border-border
                      flex items-center justify-center text-muted-foreground hover:text-foreground
                      hover:border-muted-foreground transition-all active:scale-95"
                  >
                    <Plus size={20} />
                  </button>
                )}
                <input
                  ref={addPhotosInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFilesSelected(Array.from(e.target.files).slice(0, 15 - images.length));
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Preview */}
            {selected && (
              <div className="surface-card p-2">
                {selected.processedSrc ? (
                  <BeforeAfterSlider beforeSrc={selected.originalSrc} afterSrc={selected.processedSrc} />
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-card aspect-[4/3]">
                    <img src={selected.originalSrc} alt={selected.name} className="w-full h-full object-contain" draggable={false} />
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleMagic}
                className="h-12 rounded-2xl bg-primary text-primary-foreground font-medium gap-2 active:scale-[0.98] transition-transform"
                disabled={processing}
              >
                <Wand2 size={18} /> Magia
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-12 rounded-2xl font-medium gap-2 border-border text-foreground hover:bg-secondary active:scale-[0.98] transition-transform"
                disabled={processing}
              >
                <RotateCcw size={18} /> Resetar
              </Button>
            </div>

            {/* Controls */}
            <div className="surface-card">
              <button
                onClick={() => setShowControls(!showControls)}
                className="w-full flex items-center justify-between text-sm font-medium text-foreground p-4 active:bg-secondary/50 transition-colors rounded-2xl"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-muted-foreground" /> Ajustes Manuais
                </span>
                {showControls ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
              </button>
              {showControls && (
                <div className="px-4 pb-4 space-y-5 animate-fade-in">
                  <EnhanceControls settings={enhance} onChange={setEnhance} />
                  <div className="h-px bg-border" />
                  <WatermarkControls settings={watermark} onChange={setWatermark} />
                </div>
              )}
            </div>

            {/* Progress */}
            {batchProgress !== null && (
              <div className="surface-card p-3">
                <div className="flex items-center gap-3">
                  <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${batchProgress}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">{batchProgress}%</span>
                </div>
              </div>
            )}

            {/* Apply */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleProcessCurrent}
                className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.98] transition-transform"
                disabled={processing || !selected}
              >
                {processing && batchProgress === null ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Aplicar
              </Button>
              <Button
                onClick={handleBatchProcess}
                className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.98] transition-transform"
                disabled={processing || images.length === 0}
              >
                <Layers size={18} /> Todas ({images.length})
              </Button>
            </div>

            {/* Download / Share */}
            {processedCount > 0 && (
              <div className={`grid gap-2 ${canShare ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <Button
                  onClick={handleDownloadAll}
                  className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.98] transition-transform"
                >
                  <Download size={18} /> Baixar ({processedCount})
                </Button>
                {canShare && selected?.processedSrc && (
                  <Button
                    onClick={() => selected && handleShare(selected)}
                    className="h-12 rounded-2xl bg-[hsl(142_70%_38%)] text-foreground font-medium gap-2 hover:bg-[hsl(142_70%_32%)] active:scale-[0.98] transition-transform"
                  >
                    <Share2 size={18} /> Compartilhar
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-3 text-center flex-shrink-0">
        <p className="text-[11px] text-muted-foreground">Filgueira Imobiliária © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Index;
