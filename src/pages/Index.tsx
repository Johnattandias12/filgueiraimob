import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Wand2, Download, Share2, RotateCcw, ChevronDown,
  Layers, ImageIcon, Loader2, Check, Sparkles, Plus, FileDown, ArrowLeft
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
import { processVideo, isVideoFile } from '@/lib/videoEngine';

interface MediaItem {
  id: string;
  file: File;
  originalSrc: string;
  processedSrc: string | null;
  name: string;
  type: 'image' | 'video';
}

const Index: React.FC = () => {
  const [images, setImages] = useState<MediaItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [enhance, setEnhance] = useState<EnhanceSettings>(DEFAULT_ENHANCE);
  const [watermark, setWatermark] = useState<WatermarkSettings>(DEFAULT_WATERMARK);
  const [showControls, setShowControls] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<number | null>(null);
  const [ffmpegLoading, setFfmpegLoading] = useState(false);
  const addPhotosInputRef = useRef<HTMLInputElement>(null);

  const selected = images.find(i => i.id === selectedId) || null;
  const processedCount = useMemo(() => images.filter(i => i.processedSrc).length, [images]);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleFilesSelected = useCallback((files: File[]) => {
    const newItems: MediaItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      originalSrc: URL.createObjectURL(file),
      processedSrc: null,
      name: file.name,
      type: isVideoFile(file) ? 'video' as const : 'image' as const,
    }));
    setImages(prev => [...prev, ...newItems].slice(0, 40));
    setSelectedId(prev => prev || newItems[0]?.id || null);
    setShowControls(true);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setImages(prev => {
      const removed = prev.find(i => i.id === id);
      if (removed) URL.revokeObjectURL(removed.originalSrc);
      return prev.filter(i => i.id !== id);
    });
    setSelectedId(prev => {
      if (prev !== id) return prev;
      // Use functional form — no stale closure
      let next: string | null = null;
      setImages(currentImages => {
        const remaining = currentImages.filter(i => i.id !== id);
        next = remaining[0]?.id || null;
        return currentImages; // don't mutate, just read
      });
      return next;
    });
  }, []);

  const processItem = useCallback(async (item: MediaItem, enh: EnhanceSettings, wm: WatermarkSettings) => {
    if (item.type === 'video') {
      return processVideo(item.file, {
        enhance: enh,
        watermark: wm,
        onProgress: (pct) => setBatchProgress(pct),
      });
    }
    return processImage(item.originalSrc, enh, wm);
  }, []);

  const handleProcessCurrent = useCallback(async () => {
    if (!selected) return;
    setProcessing(true);
    if (selected.type === 'video') setFfmpegLoading(true);
    try {
      const result = await processItem(selected, enhance, watermark);
      setImages(prev => prev.map(i =>
        i.id === selected.id ? { ...i, processedSrc: result } : i
      ));
    } catch (e) {
      console.error('Processing failed:', e);
    }
    setProcessing(false);
    setFfmpegLoading(false);
    setBatchProgress(null);
  }, [selected, enhance, watermark, processItem]);

  const handleMagic = useCallback(async () => {
    setEnhance(REAL_ESTATE_MAGIC);
    if (!selected) return;
    setProcessing(true);
    if (selected.type === 'video') setFfmpegLoading(true);
    try {
      const result = await processItem(selected, REAL_ESTATE_MAGIC, watermark);
      setImages(prev => prev.map(i =>
        i.id === selected.id ? { ...i, processedSrc: result } : i
      ));
    } catch (e) {
      console.error('Processing failed:', e);
    }
    setProcessing(false);
    setFfmpegLoading(false);
    setBatchProgress(null);
  }, [selected, watermark, processItem]);

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
        const result = await processItem(img, enhance, watermark);
        setImages(prev => prev.map(item =>
          item.id === img.id ? { ...item, processedSrc: result } : item
        ));
        setBatchProgress(Math.round(((i + 1) / images.length) * 100));
        await new Promise(r => setTimeout(r, 0));
      }
    } catch (e) {
      console.error('Batch processing failed:', e);
    }
    setProcessing(false);
    setBatchProgress(null);
  }, [images, enhance, watermark, processItem]);

  const handleDownload = useCallback((item: MediaItem) => {
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
      setTimeout(() => handleDownload(img), index * 300);
    });
  }, [images, handleDownload]);

  const handleDownloadCurrent = useCallback(() => {
    if (selected) handleDownload(selected);
  }, [selected, handleDownload]);

  const handleShare = useCallback(async (item: MediaItem) => {
    const src = item.processedSrc;
    if (!src) return;
    try {
      const mimeType = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
      const response = await fetch(src);
      const blob = await response.blob();
      const file = new File([blob], `filgueira_${item.name}`, { type: mimeType });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Filgueira Imobiliária' });
      }
    } catch (e) {
      console.warn('Share failed:', e);
    }
  }, []);

  const handleGoBack = useCallback(() => {
    images.forEach(img => URL.revokeObjectURL(img.originalSrc));
    setImages([]);
    setSelectedId(null);
    setShowControls(false);
    setEnhance(DEFAULT_ENHANCE);
  }, [images]);

  const thumbnails = useMemo(() => images.map(i => ({
    id: i.id,
    src: i.processedSrc || i.originalSrc,
    name: i.name,
    processed: !!i.processedSrc,
    type: i.type,
  })), [images]);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden app-entrance safe-area-pad">
      {/* Interactive background orbs */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Header */}
      <header className="glass-panel-sm sticky top-0 z-50 px-4 py-2.5 mx-2 mt-2 flex items-center justify-center relative">
        {images.length > 0 && (
          <button
            onClick={handleGoBack}
            className="absolute left-3 w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-90 touch-manipulation"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <LogoFilgueira size="sm" />
        {images.length > 0 && (
          <span className="absolute right-3 text-[11px] text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-lg tabular-nums font-medium">
            {images.length}/40
          </span>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-2 gap-2 max-w-2xl mx-auto w-full pb-6 relative z-10">
        {images.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4 animate-fade-in">
            <div className="text-center mb-2">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4 animate-pulse-glow">
                <Sparkles size={28} className="text-primary" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-1.5">Editor de Mídia</h1>
              <p className="text-muted-foreground text-sm max-w-[260px] mx-auto leading-relaxed">
                Aprimore suas fotos e vídeos imobiliários e adicione marca d'água em segundos
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
                    images={thumbnails}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onRemove={handleRemove}
                  />
                </div>
                {images.length < 40 && (
                  <button
                    onClick={() => addPhotosInputRef.current?.click()}
                    className="flex-shrink-0 w-12 h-12 rounded-xl border-2 border-dashed border-border
                      flex items-center justify-center text-muted-foreground hover:text-primary
                      hover:border-primary/50 transition-all active:scale-95 touch-manipulation"
                  >
                    <Plus size={18} />
                  </button>
                )}
                <input
                  ref={addPhotosInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files) {
                      handleFilesSelected(Array.from(e.target.files).slice(0, 40 - images.length));
                    }
                    e.target.value = '';
                  }}
                />
              </div>
            </div>

            {/* Preview */}
            {selected && (
              <div className="surface-card p-2">
                {selected.type === 'video' ? (
                  <div className="relative rounded-2xl overflow-hidden bg-card aspect-video">
                    <video
                      src={selected.processedSrc || selected.originalSrc}
                      className="w-full h-full object-contain"
                      controls
                      playsInline
                      muted
                    />
                    {selected.processedSrc && (
                      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-primary/80 backdrop-blur-sm text-primary-foreground text-[10px] font-semibold px-2 py-1 rounded-lg">
                        <Check size={12} /> Processado
                      </div>
                    )}
                  </div>
                ) : selected.processedSrc ? (
                  <BeforeAfterSlider beforeSrc={selected.originalSrc} afterSrc={selected.processedSrc} />
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-card aspect-[4/3]">
                    <img
                      src={selected.originalSrc}
                      alt={selected.name}
                      className="w-full h-full object-contain"
                      draggable={false}
                      loading="eager"
                    />
                  </div>
                )}
                {ffmpegLoading && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground animate-fade-in">
                    <Loader2 size={14} className="animate-spin text-primary" />
                    <span>Processando vídeo com FFmpeg…</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleMagic}
                className="h-12 rounded-2xl bg-primary text-primary-foreground font-medium gap-2 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-primary/20 touch-manipulation"
                disabled={processing}
              >
                <Wand2 size={18} /> Magia
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-12 rounded-2xl font-medium gap-2 border-border text-foreground hover:bg-secondary active:scale-[0.97] transition-all duration-200 touch-manipulation"
                disabled={processing}
              >
                <RotateCcw size={18} /> Resetar
              </Button>
            </div>

            {/* Controls */}
            <div className="surface-card overflow-hidden">
              <button
                onClick={() => setShowControls(!showControls)}
                className="w-full flex items-center justify-between text-sm font-medium text-foreground p-4 active:bg-secondary/50 transition-colors touch-manipulation"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon size={16} className="text-muted-foreground" /> Ajustes Manuais
                </span>
                <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-300 ${showControls ? 'rotate-180' : ''}`} />
              </button>
              <div className={`grid transition-all duration-300 ease-out ${showControls ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                  <div className="px-4 pb-4 space-y-5">
                    <EnhanceControls settings={enhance} onChange={setEnhance} />
                    <div className="h-px bg-border" />
                    <WatermarkControls settings={watermark} onChange={setWatermark} />
                  </div>
                </div>
              </div>
            </div>

            {/* Progress */}
            {batchProgress !== null && (
              <div className="surface-card p-3 animate-fade-in">
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
                className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.97] transition-all duration-200 touch-manipulation"
                disabled={processing || !selected}
              >
                {processing && batchProgress === null ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Aplicar
              </Button>
              <Button
                onClick={handleBatchProcess}
                className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.97] transition-all duration-200 touch-manipulation"
                disabled={processing || images.length === 0}
              >
                <Layers size={18} /> Todas ({images.length})
              </Button>
            </div>

            {/* Download / Share */}
            {processedCount > 0 && (
              <div className="space-y-2 animate-fade-in">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleDownloadCurrent}
                    className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.97] transition-all duration-200 touch-manipulation"
                    disabled={!selected?.processedSrc}
                  >
                    <FileDown size={18} /> Baixar Atual
                  </Button>
                  <Button
                    onClick={handleDownloadAll}
                    className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.97] transition-all duration-200 touch-manipulation"
                  >
                    <Download size={18} /> Todas ({processedCount})
                  </Button>
                </div>
                {canShare && selected?.processedSrc && (
                  <Button
                    onClick={() => selected && handleShare(selected)}
                    className="w-full h-12 rounded-2xl bg-accent/15 text-accent font-medium gap-2 hover:bg-accent/25 active:scale-[0.97] transition-all duration-200 border border-accent/20 touch-manipulation"
                  >
                    <Share2 size={18} /> Compartilhar
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="py-3 text-center flex-shrink-0 relative z-10 pb-safe">
        <p className="text-[11px] text-muted-foreground/60">Filgueira Imobiliária © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Index;
