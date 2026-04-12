import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  Wand2, RotateCcw, ChevronDown,
  ImageIcon, Layers, Loader2, Check, Sparkles, Plus, FileDown, ArrowLeft,
  PackageOpen,
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
  processImage,
} from '@/lib/imageEngine';
import { processVideo, isVideoFile } from '@/lib/videoEngine';

// Ícone do WhatsApp (SVG inline — lucide não tem)
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

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
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const addPhotosInputRef = useRef<HTMLInputElement>(null);

  const selected = images.find(i => i.id === selectedId) || null;
  const processedCount = useMemo(() => images.filter(i => i.processedSrc).length, [images]);
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const isBusy = processing || downloading;

  // ──────────────────────────────────────────────
  // Upload
  // ──────────────────────────────────────────────
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
    setShowControls(false);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setImages(prev => {
      const removed = prev.find(i => i.id === id);
      if (removed) {
        URL.revokeObjectURL(removed.originalSrc);
        if (removed.processedSrc) URL.revokeObjectURL(removed.processedSrc);
      }
      const remaining = prev.filter(i => i.id !== id);
      setSelectedId(sel => (sel !== id ? sel : remaining[0]?.id || null));
      return remaining;
    });
  }, []);

  // ──────────────────────────────────────────────
  // Processamento
  // ──────────────────────────────────────────────
  const processItem = useCallback(async (item: MediaItem, enh: EnhanceSettings, wm: WatermarkSettings) => {
    if (item.processedSrc) URL.revokeObjectURL(item.processedSrc);
    if (item.type === 'video') {
      return processVideo(item.file, { enhance: enh, watermark: wm, onProgress: setBatchProgress });
    }
    return processImage(item.originalSrc, enh, wm);
  }, []);

  // Aplica ajustes + marca d'água apenas no arquivo atual
  const handleProcessCurrent = useCallback(async () => {
    if (!selected) return;
    setProcessing(true);
    if (selected.type === 'video') setFfmpegLoading(true);
    try {
      const result = await processItem(selected, enhance, watermark);
      setImages(prev => prev.map(i => i.id === selected.id ? { ...i, processedSrc: result } : i));
    } catch (e) { console.error('Processing failed:', e); }
    setProcessing(false);
    setFfmpegLoading(false);
    setBatchProgress(null);
  }, [selected, enhance, watermark, processItem]);

  // ✨ Magia em Todas — preset imobiliário em todos os arquivos de uma vez
  const handleMagicAll = useCallback(async () => {
    setEnhance(REAL_ESTATE_MAGIC);
    setProcessing(true);
    setBatchProgress(0);
    const snapshot = [...images];
    for (let i = 0; i < snapshot.length; i++) {
      const img = snapshot[i];
      try {
        const result = await processItem(img, REAL_ESTATE_MAGIC, watermark);
        setImages(prev => prev.map(item => item.id === img.id ? { ...item, processedSrc: result } : item));
      } catch (e) { console.error(`Falha em ${img.name}:`, e); }
      setBatchProgress(Math.round(((i + 1) / snapshot.length) * 100));
      await new Promise(r => setTimeout(r, 0));
    }
    setProcessing(false);
    setBatchProgress(null);
  }, [images, watermark, processItem]);

  // Aplicar ajustes manuais em TODOS os arquivos (sem mudar o preset)
  const handleBatchApply = useCallback(async () => {
    setProcessing(true);
    setBatchProgress(0);
    const snapshot = [...images];
    for (let i = 0; i < snapshot.length; i++) {
      const img = snapshot[i];
      try {
        const result = await processItem(img, enhance, watermark);
        setImages(prev => prev.map(item => item.id === img.id ? { ...item, processedSrc: result } : item));
      } catch (e) { console.error(`Falha em ${img.name}:`, e); }
      setBatchProgress(Math.round(((i + 1) / snapshot.length) * 100));
      await new Promise(r => setTimeout(r, 0));
    }
    setProcessing(false);
    setBatchProgress(null);
  }, [images, enhance, watermark, processItem]);

  const handleReset = useCallback(() => {
    setEnhance(DEFAULT_ENHANCE);
    if (selected) {
      setImages(prev => prev.map(i => i.id === selected.id ? { ...i, processedSrc: null } : i));
    }
  }, [selected]);

  // ──────────────────────────────────────────────
  // Download
  // ──────────────────────────────────────────────
  const handleDownload = useCallback((item: MediaItem) => {
    const src = item.processedSrc || item.originalSrc;
    const ext = item.type === 'video' ? 'mp4' : 'jpg';
    const base = item.name.replace(/\.[^.]+$/, '');
    const a = document.createElement('a');
    a.href = src;
    a.download = `filgueira_${base}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  // Baixar TODAS em um único ZIP
  const handleDownloadAll = useCallback(async () => {
    const processed = images.filter(i => i.processedSrc);
    if (!processed.length) return;
    if (processed.length === 1) { handleDownload(processed[0]); return; }

    setDownloading(true);
    setDownloadProgress(0);
    try {
      const { default: JSZip } = await import('jszip');
      const zip = new JSZip();
      for (let i = 0; i < processed.length; i++) {
        const item = processed[i];
        const res = await fetch(item.processedSrc!);
        const blob = await res.blob();
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const base = item.name.replace(/\.[^.]+$/, '');
        zip.file(`filgueira_${base}.${ext}`, blob);
        setDownloadProgress(Math.round(((i + 1) / processed.length) * 80));
      }
      const zipBlob = await zip.generateAsync(
        { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } },
        m => setDownloadProgress(80 + Math.round(m.percent * 0.2))
      );
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `filgueira_${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e) {
      console.error('ZIP failed, falling back:', e);
      processed.forEach((img, idx) => setTimeout(() => handleDownload(img), idx * 400));
    }
    setDownloading(false);
    setDownloadProgress(null);
  }, [images, handleDownload]);

  // ──────────────────────────────────────────────
  // Compartilhar — SEM título/texto (vai limpo para o WhatsApp)
  // ──────────────────────────────────────────────
  const buildShareFiles = useCallback(async (
    items: MediaItem[],
    onProgress?: (pct: number) => void
  ): Promise<File[]> => {
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const mime = item.type === 'video' ? 'video/mp4' : 'image/jpeg';
      const ext  = item.type === 'video' ? 'mp4' : 'jpg';
      const base = item.name.replace(/\.[^.]+$/, '');
      const res  = await fetch(item.processedSrc!);
      const blob = await res.blob();
      files.push(new File([blob], `filgueira_${base}.${ext}`, { type: mime }));
      onProgress?.(Math.round(((i + 1) / items.length) * 100));
    }
    return files;
  }, []);

  // Compartilhar arquivo atual
  const handleShareCurrent = useCallback(async () => {
    if (!selected?.processedSrc) return;
    try {
      const [file] = await buildShareFiles([selected]);
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] }); // sem title/text → chega limpo no WhatsApp
      }
    } catch (e) { console.warn('Share failed:', e); }
  }, [selected, buildShareFiles]);

  // 📱 Compartilhar TODAS via WhatsApp (Web Share API nativa)
  const handleShareAll = useCallback(async () => {
    const processed = images.filter(i => i.processedSrc);
    if (!processed.length) return;

    // Arquivo único → share direto sem loading
    if (processed.length === 1) { await handleShareCurrent(); return; }

    setDownloading(true);
    setDownloadProgress(0);
    try {
      const files = await buildShareFiles(processed, setDownloadProgress);
      if (navigator.share && navigator.canShare?.({ files })) {
        await navigator.share({ files }); // sem title/text → limpo no WhatsApp
      } else {
        // Fallback: ZIP se a API não suportar múltiplos arquivos
        await handleDownloadAll();
        return; // handleDownloadAll já gerencia downloading state
      }
    } catch (e) {
      console.warn('Share all failed, falling back to ZIP:', e);
      // Fallback para ZIP se o share lançar erro (ex: usuário cancelou não conta)
      const isCancelError = e instanceof Error && e.name === 'AbortError';
      if (!isCancelError) {
        setDownloading(false);
        setDownloadProgress(null);
        await handleDownloadAll();
        return;
      }
    }
    setDownloading(false);
    setDownloadProgress(null);
  }, [images, buildShareFiles, handleShareCurrent, handleDownloadAll]);

  const handleGoBack = useCallback(() => {
    images.forEach(img => {
      URL.revokeObjectURL(img.originalSrc);
      if (img.processedSrc) URL.revokeObjectURL(img.processedSrc);
    });
    setImages([]);
    setSelectedId(null);
    setShowControls(false);
    setEnhance(DEFAULT_ENHANCE);
    setWatermark(DEFAULT_WATERMARK);
  }, [images]);

  const thumbnails = useMemo(() => images.map(i => ({
    id: i.id,
    src: i.processedSrc || i.originalSrc,
    name: i.name,
    processed: !!i.processedSrc,
    type: i.type,
  })), [images]);

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative overflow-hidden app-entrance safe-area-pad">
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* Header */}
      <header className="glass-panel-sm sticky top-0 z-50 px-4 py-2.5 mx-2 mt-2 flex items-center justify-between">
        {images.length > 0 ? (
          <button
            onClick={handleGoBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-all active:scale-90 touch-manipulation"
          >
            <ArrowLeft size={18} />
          </button>
        ) : <div className="w-10" />}

        <LogoFilgueira size="sm" />

        {images.length > 0 ? (
          <span className="text-[11px] text-muted-foreground bg-secondary/80 px-2.5 py-1 rounded-lg tabular-nums font-medium">
            {images.length}/40
          </span>
        ) : <div className="w-10" />}
      </header>

      <main className="flex-1 flex flex-col p-2 gap-2 max-w-2xl mx-auto w-full pb-6 relative z-10">
        {images.length === 0 ? (
          /* ── Tela inicial ── */
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
          /* ── Editor ── */
          <div className="flex flex-col gap-2 animate-fade-in">

            {/* Miniaturas + botão adicionar */}
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
                  onChange={e => {
                    if (e.target.files)
                      handleFilesSelected(Array.from(e.target.files).slice(0, 40 - images.length));
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
                      controls playsInline muted
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

            {/* ── AÇÃO PRINCIPAL: Magia em Todas ── */}
            <Button
              onClick={handleMagicAll}
              disabled={isBusy}
              className="h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base gap-2.5 active:scale-[0.97] transition-all duration-200 shadow-lg shadow-primary/20 touch-manipulation"
            >
              {processing && batchProgress !== null
                ? <Loader2 size={20} className="animate-spin" />
                : <Wand2 size={20} />
              }
              {processing && batchProgress !== null
                ? `Aplicando… ${batchProgress}%`
                : `✨ Magia em Todas (${images.length})`
              }
            </Button>

            {/* Ajustes manuais + resetar (colapsível) */}
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
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Button
                        onClick={handleProcessCurrent}
                        disabled={isBusy || !selected}
                        className="h-11 rounded-xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.97] transition-all duration-200 touch-manipulation"
                      >
                        {processing && batchProgress === null
                          ? <Loader2 size={16} className="animate-spin" />
                          : <Check size={16} />
                        }
                        Aplicar Atual
                      </Button>
                      <Button
                        onClick={handleReset}
                        variant="outline"
                        disabled={isBusy}
                        className="h-11 rounded-xl font-medium gap-2 border-border text-foreground hover:bg-secondary active:scale-[0.97] transition-all duration-200 touch-manipulation"
                      >
                        <RotateCcw size={16} /> Resetar
                      </Button>
                    </div>
                    {/* Aplicar ajustes em lote — usa configurações manuais do slider */}
                    <Button
                      onClick={handleBatchApply}
                      disabled={isBusy || images.length === 0}
                      className="w-full h-11 rounded-xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.97] transition-all duration-200 touch-manipulation"
                    >
                      {processing && batchProgress !== null
                        ? <Loader2 size={16} className="animate-spin" />
                        : <Layers size={16} />
                      }
                      Aplicar em Todas ({images.length})
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Barra de progresso (processamento ou ZIP) */}
            {(batchProgress !== null || downloadProgress !== null) && (
              <div className="surface-card p-3 animate-fade-in">
                <div className="flex items-center gap-3">
                  <Loader2 size={16} className="text-primary animate-spin flex-shrink-0" />
                  <div className="flex-1">
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${batchProgress ?? downloadProgress ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {downloading ? 'Preparando…' : ''} {batchProgress ?? downloadProgress ?? 0}%
                  </span>
                </div>
              </div>
            )}

            {/* ── EXPORTAÇÃO (aparece após processar) ── */}
            {processedCount > 0 && (
              <div className="space-y-2 animate-fade-in">

                {/* Botão WhatsApp — destaque, verde */}
                {canShare && (
                  <Button
                    onClick={handleShareAll}
                    disabled={isBusy}
                    className="w-full h-14 rounded-2xl font-semibold text-base gap-2.5 active:scale-[0.97] transition-all duration-200 touch-manipulation text-white"
                    style={{ background: downloading ? '#128C7E' : '#25D366', boxShadow: '0 4px 20px #25D36640' }}
                  >
                    {downloading
                      ? <Loader2 size={20} className="animate-spin" />
                      : <WhatsAppIcon />
                    }
                    {downloading
                      ? `Preparando… ${downloadProgress ?? 0}%`
                      : processedCount > 1
                        ? `Enviar ${processedCount} arquivos para WhatsApp`
                        : 'Enviar para WhatsApp'
                    }
                  </Button>
                )}

                {/* Baixar ZIP + Baixar atual */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleDownloadAll}
                    disabled={isBusy}
                    className="h-11 rounded-xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.97] transition-all duration-200 touch-manipulation"
                  >
                    {downloading
                      ? <Loader2 size={16} className="animate-spin" />
                      : <PackageOpen size={16} />
                    }
                    {processedCount > 1 ? `ZIP (${processedCount})` : 'Baixar'}
                  </Button>
                  <Button
                    onClick={() => selected && handleDownload(selected)}
                    disabled={isBusy || !selected?.processedSrc}
                    className="h-11 rounded-xl bg-secondary text-secondary-foreground font-medium gap-2 hover:bg-surface-hover active:scale-[0.97] transition-all duration-200 touch-manipulation"
                  >
                    <FileDown size={16} /> Baixar Atual
                  </Button>
                </div>
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
