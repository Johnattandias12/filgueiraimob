// Video processing engine using FFmpeg.wasm
// Applies the same "Magic" filter + text watermark as the image engine

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { EnhanceSettings, WatermarkSettings, REAL_ESTATE_MAGIC, DEFAULT_WATERMARK } from './imageEngine';

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<void> | null = null;

export async function getFFmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpeg && ffmpeg.loaded) return ffmpeg;

  if (loadPromise) {
    await loadPromise;
    return ffmpeg!;
  }

  ffmpeg = new FFmpeg();

  if (onLog) {
    ffmpeg.on('log', ({ message }) => onLog(message));
  }

  loadPromise = (async () => {
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    await ffmpeg!.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
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

  // Transparent background
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

  // Convert canvas to PNG ArrayBuffer
  const dataURL = canvas.toDataURL('image/png');
  const binaryStr = atob(dataURL.split(',')[1]);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes;
}

/**
 * Build FFmpeg eq filter string from EnhanceSettings.
 * FFmpeg eq: brightness [-1,1], contrast [0,2], saturation [0,3]
 */
function buildColorFilter(settings: EnhanceSettings): string {
  const brightness = settings.exposure / 200;        // 8 → 0.04
  const contrast = 1 + settings.contrast / 100;      // -3 → 0.97
  const saturation = 1 + settings.saturation / 100;   // 10 → 1.1
  return `eq=brightness=${brightness.toFixed(3)}:contrast=${contrast.toFixed(3)}:saturation=${saturation.toFixed(3)}`;
}

function buildWarmthFilter(warmth: number): string {
  if (warmth === 0) return '';
  const shift = warmth / 240; // 12 → 0.05
  return `colorbalance=rs=${shift.toFixed(3)}:gs=${(shift * 0.4).toFixed(3)}:bs=${(-shift).toFixed(3)}:rm=${shift.toFixed(3)}:gm=${(shift * 0.4).toFixed(3)}:bm=${(-shift).toFixed(3)}`;
}

export interface VideoProcessOptions {
  enhance: EnhanceSettings;
  watermark: WatermarkSettings;
  onProgress?: (pct: number) => void;
  onLog?: (msg: string) => void;
}

/**
 * Probe video dimensions using a <video> element.
 */
function getVideoDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = reject;
    video.src = src;
  });
}

/**
 * Process a video file: apply color enhancements + watermark overlay.
 * Returns a Blob URL to the processed MP4.
 */
export async function processVideo(
  file: File,
  options: VideoProcessOptions
): Promise<string> {
  const { enhance, watermark, onProgress, onLog } = options;

  const ff = await getFFmpeg(onLog);

  // Write input file
  const inputData = await fetchFile(file);
  await ff.writeFile('input.mp4', inputData);

  // Build filter chain
  const filters: string[] = [];
  
  const colorFilter = buildColorFilter(enhance);
  filters.push(colorFilter);

  const warmthFilter = buildWarmthFilter(enhance.warmth);
  if (warmthFilter) filters.push(warmthFilter);

  // Build FFmpeg command
  const args: string[] = ['-i', 'input.mp4'];

  if (watermark.enabled) {
    // Get video dimensions for watermark sizing
    const objectURL = URL.createObjectURL(file);
    const dims = await getVideoDimensions(objectURL);
    URL.revokeObjectURL(objectURL);

    const watermarkPNG = generateWatermarkPNG(dims.width, dims.height, watermark);
    await ff.writeFile('watermark.png', watermarkPNG);

    args.push('-i', 'watermark.png');

    // Apply color filters first, then overlay watermark
    const colorChain = filters.join(',');
    const filterComplex = `[0:v]${colorChain}[colored];[colored][1:v]overlay=0:0[out]`;
    args.push('-filter_complex', filterComplex);
    args.push('-map', '[out]', '-map', '0:a?');
  } else {
    // Only color filters, no watermark
    args.push('-vf', filters.join(','));
  }

  // Output settings — fast encoding for mobile
  args.push(
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-crf', '23',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    '-y',
    'output.mp4'
  );

  // Track progress
  if (onProgress) {
    ff.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });
  }

  await ff.exec(args);

  // Read output
  const outputData = await ff.readFile('output.mp4');
  const blob = new Blob([outputData as unknown as BlobPart], { type: 'video/mp4' });
  
  // Cleanup
  await ff.deleteFile('input.mp4');
  await ff.deleteFile('output.mp4');
  try { await ff.deleteFile('watermark.png'); } catch {}

  return URL.createObjectURL(blob);
}

/**
 * Check if a file is a video.
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}
