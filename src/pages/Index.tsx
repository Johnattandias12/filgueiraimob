import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Wand2, Download, Share2, Upload, RotateCcw, ChevronDown, ChevronUp,
  Layers, ImageIcon, Loader2, Check, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import UploadZone from '@/components/UploadZone';
import ThumbnailStrip from '@/components/ThumbnailStrip';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';
import EnhanceControls from '@/components/EnhanceControls';
import WatermarkControls from '@/components/WatermarkControls';
import {
  EnhanceSettings, WatermarkSettings,
  DEFAULT_ENHANCE, REAL_ESTATE_MAGIC, DEFAULT_WATERMARK,
  processImage, dataURLtoBlob, loadImage
} from '@/lib/imageEngine';
import defaultLogoUrl from '@/assets/filgueira-logo.png';

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
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<number | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Load default or saved logo
  useEffect(() => {
    const savedLogo = localStorage.getItem('filgueira-logo');
    if (savedLogo) {
      setLogoSrc(savedLogo);
    } else {
      // Convert the bundled logo to data URL and save
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        canvas.getContext('2d')!.drawImage(img, 0, 0);
        const dataUrl = canvas.toDataURL('image/png');
        setLogoSrc(dataUrl);
        localStorage.setItem('filgueira-logo', dataUrl);
      };
      img.src = defaultLogoUrl;
    }
  }, []);

  const selected = images.find(i => i.id === selectedId) || null;

  const handleFilesSelected = useCallback((files: File[]) => {
    const newImages: ImageItem[] = files.map(file => ({
      id: crypto.randomUUID(),
      file,
      originalSrc: URL.createObjectURL(file),
      processedSrc: null,
      name: file.name,
    }));
    setImages(prev => {
      const combined = [...prev, ...newImages].slice(0, 15);
      if (!selectedId || !prev.find(i => i.id === selectedId)) {
        setSelectedId(combined[0]?.id || null);
      }
      return combined;
    });
    setShowControls(true);
  }, [selectedId]);

  const handleRemove = useCallback((id: string) => {
    setImages(prev => {
      const next = prev.filter(i => i.id !== id);
      if (selectedId === id) setSelectedId(next[0]?.id || null);
      return next;
    });
  }, [selectedId]);

  const handleProcessCurrent = useCallback(async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const result = await processImage(selected.originalSrc, enhance, watermark, logoSrc);
      setImages(prev => prev.map(i =>
        i.id === selected.id ? { ...i, processedSrc: result } : i
      ));
    } catch (e) {
      console.error('Processing failed:', e);
    }
    setProcessing(false);
  }, [selected, enhance, watermark, logoSrc]);

  const handleMagic = useCallback(() => {
    setEnhance(REAL_ESTATE_MAGIC);
  }, []);

  const handleReset = useCallback(() => {
    setEnhance(DEFAULT_ENHANCE);
  }, []);

  const handleBatchProcess = useCallback(async () => {
    setProcessing(true);
    setBatchProgress(0);
    try {
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const result = await processImage(img.originalSrc, enhance, watermark, logoSrc);
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
  }, [images, enhance, watermark, logoSrc]);

  const handleDownload = useCallback((item: ImageItem) => {
    const src = item.processedSrc || item.originalSrc;
    const a = document.createElement('a');
    a.href = src;
    a.download = `filgueira_${item.name}`;
    a.click();
  }, []);

  const handleDownloadAll = useCallback(() => {
    images.forEach(img => {
      if (img.processedSrc) handleDownload(img);
    });
  }, [images, handleDownload]);

  const handleShare = useCallback(async (item: ImageItem) => {
    const src = item.processedSrc || item.originalSrc;
    try {
      const blob = dataURLtoBlob(src);
      const file = new File([blob], `filgueira_${item.name}`, { type: 'image/jpeg' });
      if (navigator.share) {
        await navigator.share({ files: [file], title: 'Filgueira Imobiliária' });
      }
    } catch (e) {
      console.warn('Share failed:', e);
    }
  }, []);

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoSrc(dataUrl);
      localStorage.setItem('filgueira-logo', dataUrl);
    };
    reader.readAsDataURL(file);
  }, []);

  const processedCount = images.filter(i => i.processedSrc).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="glass-panel-sm sticky top-0 z-50 px-4 py-3 mx-2 mt-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Filgueira</h1>
          <p className="text-xs text-muted-foreground">Editor Imobiliário</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => logoInputRef.current?.click()}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-secondary"
          >
            Logo
          </button>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />
          {images.length > 0 && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-lg">
              {images.length} foto{images.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col p-2 gap-2 max-w-4xl mx-auto w-full">
        {images.length === 0 ? (
          /* Upload State */
          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-4 animate-fade-in">
            <div className="text-center mb-4">
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={36} className="text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Editor de Fotos
              </h2>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                Aprimore suas fotos imobiliárias e adicione marca d'água em segundos
              </p>
            </div>
            <div className="w-full max-w-md">
              <UploadZone onFilesSelected={handleFilesSelected} />
            </div>
          </div>
        ) : (
          /* Editor State */
          <div className="flex flex-col gap-2 animate-fade-in">
            {/* Thumbnail Strip */}
            <div className="surface-card p-2">
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
              {/* Add more photos */}
              <div className="mt-2 flex items-center gap-2">
                <UploadZone onFilesSelected={handleFilesSelected} maxFiles={15 - images.length} />
              </div>
            </div>

            {/* Preview */}
            {selected && (
              <div className="surface-card p-3">
                {selected.processedSrc ? (
                  <BeforeAfterSlider
                    beforeSrc={selected.originalSrc}
                    afterSrc={selected.processedSrc}
                  />
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-card aspect-[4/3]">
                    <img
                      src={selected.originalSrc}
                      alt={selected.name}
                      className="w-full h-full object-contain"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Controls Panel */}
            <div className="surface-card p-4">
              <button
                onClick={() => setShowControls(!showControls)}
                className="w-full flex items-center justify-between text-sm font-medium text-foreground mb-3"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon size={16} /> Ajustes e Marca d'água
                </span>
                {showControls ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {showControls && (
                <div className="space-y-6 animate-fade-in">
                  <EnhanceControls settings={enhance} onChange={setEnhance} />
                  <div className="h-px bg-border" />
                  <WatermarkControls settings={watermark} onChange={setWatermark} />
                </div>
              )}
            </div>

            {/* Batch progress */}
            {batchProgress !== null && (
              <div className="surface-card p-3">
                <div className="flex items-center gap-3">
                  <Loader2 size={16} className="text-primary animate-spin" />
                  <div className="flex-1">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${batchProgress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{batchProgress}%</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleMagic}
                className="h-12 rounded-2xl bg-primary text-primary-foreground font-medium gap-2"
                disabled={processing}
              >
                <Wand2 size={18} /> Magia Imobiliária
              </Button>
              <Button
                onClick={handleReset}
                variant="outline"
                className="h-12 rounded-2xl font-medium gap-2 border-border text-foreground hover:bg-secondary"
                disabled={processing}
              >
                <RotateCcw size={18} /> Resetar
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleProcessCurrent}
                className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover"
                disabled={processing || !selected}
              >
                {processing && !batchProgress ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                Aplicar
              </Button>
              <Button
                onClick={handleBatchProcess}
                className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover"
                disabled={processing || images.length === 0}
              >
                <Layers size={18} />
                Aplicar Todas ({images.length})
              </Button>
            </div>

            {processedCount > 0 && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleDownloadAll}
                  className="h-12 rounded-2xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover"
                >
                  <Download size={18} /> Baixar ({processedCount})
                </Button>
                {selected?.processedSrc && navigator.share && (
                  <Button
                    onClick={() => selected && handleShare(selected)}
                    className="h-12 rounded-2xl bg-[hsl(142_70%_40%)] text-foreground font-medium gap-2 hover:bg-[hsl(142_70%_35%)]"
                  >
                    <Share2 size={18} /> WhatsApp
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-3 text-center">
        <p className="text-xs text-muted-foreground">Filgueira Imobiliária © {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
};

export default Index;
