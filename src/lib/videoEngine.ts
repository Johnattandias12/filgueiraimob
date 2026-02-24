// Video processing engine using FFmpeg.wasm
// Applies the same "Magic" filter + text watermark as the image engine

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { EnhanceSettings, WatermarkSettings } from './imageEngine';

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

  // Convert canvas to PNG bytes
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
 */
function getVideoDimensions(src: string): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
      URL.revokeObjectURL(video.src);
    };
    video.onerror = reject;
    video.src = src;
  });
}

/**
 * Clamp video to max 720p for speed on mobile (iPhone especially).
 * Returns scale filter string or empty string if already small enough.
 */
function getScaleFilter(w: number, h: number): string {
  const MAX = 720;
  if (w <= MAX && h <= MAX) return '';
  // Scale the largest dimension to MAX, keep aspect ratio, ensure even dimensions
  if (w >= h) {
    return `scale=${MAX}:-2`;
  }
  return `scale=-2:${MAX}`;
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

  const ff = await getFFmpeg();

  // Clean up previous progress handler to avoid listener leak
  if (progressHandler) {
    ff.off('progress', progressHandler);
    progressHandler = null;
  }

  // Write input file
  const inputData = await fetchFile(file);
  await ff.writeFile('input.mp4', inputData);

  // Get video dimensions for scaling + watermark
  const objectURL = URL.createObjectURL(file);
  const dims = await getVideoDimensions(objectURL);
  URL.revokeObjectURL(objectURL);

  // Build filter chain
  const filters: string[] = [];

  // Scale down for speed on mobile
  const scaleFilter = getScaleFilter(dims.width, dims.height);
  if (scaleFilter) filters.push(scaleFilter);

  // Determine output dimensions for watermark
  const outputW = scaleFilter
    ? (dims.width >= dims.height ? 720 : Math.round((dims.width / dims.height) * 720 / 2) * 2)
    : dims.width;
  const outputH = scaleFilter
    ? (dims.height >= dims.width ? 720 : Math.round((dims.height / dims.width) * 720 / 2) * 2)
    : dims.height;

  filters.push(buildColorFilter(enhance));

  const warmthFilter = buildWarmthFilter(enhance.warmth);
  if (warmthFilter) filters.push(warmthFilter);

  // Build FFmpeg command
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

  // Output settings — optimized for speed on mobile/iOS
  args.push(
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'fastdecode',
    '-crf', '28',       // Higher CRF = faster, slightly lower quality but fine for real estate
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '96k',      // Lower audio bitrate for speed
    '-movflags', '+faststart',
    '-y',
    'output.mp4'
  );

  // Track progress — single handler, cleaned up properly
  if (onProgress) {
    progressHandler = ({ progress }) => {
      onProgress(Math.round(Math.min(progress, 1) * 100));
    };
    ff.on('progress', progressHandler);
  }

  await ff.exec(args);

  // Clean up progress handler
  if (progressHandler) {
    ff.off('progress', progressHandler);
    progressHandler = null;
  }

  // Read output
  const outputData = await ff.readFile('output.mp4');
  const blob = new Blob([outputData as unknown as BlobPart], { type: 'video/mp4' });

  // Cleanup temp files
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
