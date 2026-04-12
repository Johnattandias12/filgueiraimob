// Video processing engine using FFmpeg.wasm
// Applies the same "Magic" filter + text watermark as the image engine

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { EnhanceSettings, WatermarkSettings } from './imageEngine';

// Limite de tamanho de vídeo: 500MB
const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;
let progressHandler: ((e: { progress: number }) => void) | null = null;

export async function getFFmpeg(): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  if (loadPromise) {
    await loadPromise;
    return ffmpeg!;
  }

  ffmpeg = new FFmpeg();

  loadPromise = (async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    ]);
    await ffmpeg!.load({ coreURL, wasmURL });
  })();

  await loadPromise;
  return ffmpeg!;
}

/**
 * Generates the watermark as a transparent PNG via Canvas,
 * so we can overlay it on the video with FFmpeg.
 */
function generateWatermarkPNG(
  videoWidth: number,
  videoHeight: number,
  settings: WatermarkSettings
): Uint8Array {
  const canvas = document.createElement('canvas');
  canvas.width = videoWidth;
  canvas.height = videoHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, videoWidth, videoHeight);

  const scale = (videoWidth * settings.size) / 100;
  const mainFontSize = scale * 0.55;
  const subFontSize = scale * 0.18;
  const padding = videoWidth * 0.03;
  const totalHeight = mainFontSize + subFontSize + scale * 0.05;

  let cx: number, cy: number;
  switch (settings.position) {
    case 'top-left':
      cx = padding + scale * 0.5; cy = padding + totalHeight * 0.4; break;
    case 'top-right':
      cx = videoWidth - padding - scale * 0.5; cy = padding + totalHeight * 0.4; break;
    case 'bottom-left':
      cx = padding + scale * 0.5; cy = videoHeight - padding - totalHeight * 0.5; break;
    case 'bottom-right':
      cx = videoWidth - padding - scale * 0.5; cy = videoHeight - padding - totalHeight * 0.5; break;
    case 'center':
    default:
      cx = videoWidth / 2; cy = videoHeight / 2; break;
  }

  ctx.globalAlpha = settings.opacity / 100;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `900 ${mainFontSize}px -apple-system, BlinkMacSystemFont, "Inter", "Roboto", "Helvetica Neue", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Filgueira', cx, cy - subFontSize * 0.6);

  ctx.font = `700 ${subFontSize}px Georgia, "Times New Roman", serif`;
  ctx.fillText('Imobiliária', cx, cy + mainFontSize * 0.45);

  const dataURL = canvas.toDataURL('image/png');
  const binaryStr = atob(dataURL.split(',')[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes;
}

/**
 * Build FFmpeg eq filter string from EnhanceSettings.
 */
function buildColorFilter(settings: EnhanceSettings): string {
  const brightness = settings.exposure / 200;
  const contrast = 1 + settings.contrast / 100;
  const saturation = 1 + settings.saturation / 100;
  return `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`;
}

function buildWarmthFilter(warmth: number): string {
  if (warmth === 0) return '';
  const shift = warmth / 240;
  return `colorbalance=rs=${shift.toFixed(3)}:gs=${(shift * 0.4).toFixed(3)}:bs=${(-shift).toFixed(3)}:rm=${shift.toFixed(3)}:gm=${(shift * 0.4).toFixed(3)}:bm=${(-shift).toFixed(3)}`;
}

export interface VideoProcessOptions {
  enhance: EnhanceSettings;
  watermark: WatermarkSettings;
  onProgress?: (pct: number) => void;
}

/**
 * Probe video dimensions using a <video> element.
 * Revokes the objectURL properly in both success and error paths.
 */
function getVideoDimensions(src: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    const cleanup = () => URL.revokeObjectURL(video.src);

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout ao ler metadados do vídeo'));
    }, 15_000);

    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      cleanup();
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      cleanup();
      reject(new Error('Falha ao carregar metadados do vídeo'));
    };

    video.src = src;
  });
}

/**
 * Clamp video to max 1080p for speed on mobile (iPhone especially).
 */
function getScaleFilter(w: number, h: number): string {
  const MAX = 1080;
  if (w <= MAX && h <= MAX) return '';
  if (w >= h) {
    return `scale=${MAX}:-2`;
  }
  return `scale=-2:${MAX}`;
}

/**
 * Calculate output dimensions after scaling, matching what FFmpeg -2 produces.
 * Ensures the result is always divisible by 2 (required by yuv420p).
 */
function getOutputDimensions(
  origW: number,
  origH: number,
  scaleFilter: string
): { w: number; h: number } {
  if (!scaleFilter) return { w: origW, h: origH };

  const MAX = 1080;
  if (origW >= origH) {
    // scale=1080:-2  →  width fixed, height auto
    const w = MAX;
    const h = Math.round((origH / origW) * MAX / 2) * 2;
    return { w, h };
  } else {
    // scale=-2:1080  →  height fixed, width auto
    const h = MAX;
    const w = Math.round((origW / origH) * MAX / 2) * 2;
    return { w, h };
  }
}

/**
 * Process a video file: apply color enhancements + watermark overlay.
 * Returns a Blob URL to the processed MP4.
 */
export async function processVideo(
  file: File,
  options: VideoProcessOptions
): Promise<string> {
  const { enhance, watermark, onProgress } = options;

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    throw new Error(`Vídeo muito grande (${(file.size / 1024 / 1024).toFixed(0)}MB). Tamanho máximo: 500MB.`);
  }

  const ff = await getFFmpeg();

  // Remove handler anterior para evitar vazamento de listener
  if (progressHandler) {
    ff.off('progress', progressHandler);
    progressHandler = null;
  }

  // Escreve arquivo de entrada
  const inputData = await fetchFile(file);
  await ff.writeFile('input.mp4', inputData);

  // Cria objectURL separado para leitura de metadados (será revogado dentro da função)
  const metaURL = URL.createObjectURL(file);
  const dims = await getVideoDimensions(metaURL);

  // Monta cadeia de filtros
  const filters: string[] = [];

  const scaleFilter = getScaleFilter(dims.width, dims.height);
  if (scaleFilter) filters.push(scaleFilter);

  const { w: outputW, h: outputH } = getOutputDimensions(dims.width, dims.height, scaleFilter);

  filters.push(buildColorFilter(enhance));

  const warmthFilter = buildWarmthFilter(enhance.warmth);
  if (warmthFilter) filters.push(warmthFilter);

  const args: string[] = ['-i', 'input.mp4'];

  if (watermark.enabled) {
    const watermarkPNG = generateWatermarkPNG(outputW, outputH, watermark);
    await ff.writeFile('watermark.png', watermarkPNG);
    args.push('-i', 'watermark.png');

    const colorChain = filters.join(',');
    const filterComplex = `[0:v]${colorChain}[colored];[colored][1:v]overlay=0:0[out]`;
    args.push('-filter_complex', filterComplex);
    args.push('-map', '[out]', '-map', '0:a?');
  } else {
    args.push('-vf', filters.join(','));
  }

  args.push(
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'fastdecode',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-movflags', '+faststart',
    '-y',
    'output.mp4'
  );

  if (onProgress) {
    progressHandler = ({ progress }) => {
      onProgress(Math.round(Math.min(progress, 1) * 100));
    };
    ff.on('progress', progressHandler);
  }

  try {
    await ff.exec(args);
  } finally {
    // Garante remoção do handler mesmo se exec falhar
    if (progressHandler) {
      ff.off('progress', progressHandler);
      progressHandler = null;
    }
  }

  const outputData = await ff.readFile('output.mp4');
  const blob = new Blob([outputData as unknown as BlobPart], { type: 'video/mp4' });

  try { await ff.deleteFile('input.mp4'); } catch {}
  try { await ff.deleteFile('output.mp4'); } catch {}
  try { await ff.deleteFile('watermark.png'); } catch {}

  return URL.createObjectURL(blob);
}

/**
 * Check if a file is a video.
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}
