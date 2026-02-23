// Canvas-based image processing engine for real estate photos

export interface EnhanceSettings {
  exposure: number;
  contrast: number;
  saturation: number;
  warmth: number;
}

export interface WatermarkSettings {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size: number;
  opacity: number;
}

export const DEFAULT_ENHANCE: EnhanceSettings = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
};

export const REAL_ESTATE_MAGIC: EnhanceSettings = {
  exposure: 8,
  contrast: -3,
  saturation: 10,
  warmth: 12,
};

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: true,
  position: 'bottom-right',
  size: 16,
  opacity: 30,
};

// Safari iOS limits canvas to ~16.7 megapixels
const MAX_CANVAS_PIXELS = 16_000_000;

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function clampDimensions(w: number, h: number): { width: number; height: number } {
  const pixels = w * h;
  if (pixels <= MAX_CANVAS_PIXELS) return { width: w, height: h };
  const scale = Math.sqrt(MAX_CANVAS_PIXELS / pixels);
  return { width: Math.floor(w * scale), height: Math.floor(h * scale) };
}

export function applyEnhancements(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: EnhanceSettings
) {
  if (settings.exposure === 0 && settings.contrast === 0 &&
      settings.saturation === 0 && settings.warmth === 0) return;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const len = data.length;

  const exposureFactor = 1 + settings.exposure / 100;
  const contrastFactor = (259 * (settings.contrast * 2.55 + 255)) / (255 * (259 - settings.contrast * 2.55));
  const satFactor = 1 + settings.saturation / 100;
  const warmthShift = settings.warmth * 0.5;

  for (let i = 0; i < len; i += 4) {
    let r = data[i] * exposureFactor;
    let g = data[i + 1] * exposureFactor;
    let b = data[i + 2] * exposureFactor;

    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = gray + satFactor * (r - gray) + warmthShift;
    g = gray + satFactor * (g - gray);
    b = gray + satFactor * (b - gray) - warmthShift;

    data[i] = r < 0 ? 0 : r > 255 ? 255 : r | 0;
    data[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g | 0;
    data[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b | 0;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function drawTextWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  settings: WatermarkSettings
) {
  if (!settings.enabled) return;

  const scale = (canvasWidth * settings.size) / 100;
  const mainFontSize = scale * 0.55;
  const subFontSize = scale * 0.18;

  const padding = canvasWidth * 0.03;
  const totalHeight = mainFontSize + subFontSize + scale * 0.05;

  let cx: number, cy: number;

  switch (settings.position) {
    case 'top-left':
      cx = padding + scale * 0.5; cy = padding + totalHeight * 0.4; break;
    case 'top-right':
      cx = canvasWidth - padding - scale * 0.5; cy = padding + totalHeight * 0.4; break;
    case 'bottom-left':
      cx = padding + scale * 0.5; cy = canvasHeight - padding - totalHeight * 0.5; break;
    case 'bottom-right':
      cx = canvasWidth - padding - scale * 0.5; cy = canvasHeight - padding - totalHeight * 0.5; break;
    case 'center':
      cx = canvasWidth / 2; cy = canvasHeight / 2; break;
  }

  ctx.save();
  ctx.globalAlpha = settings.opacity / 100;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // "Filgueira" — bold sans-serif
  ctx.font = `900 ${mainFontSize}px -apple-system, BlinkMacSystemFont, "Inter", "Roboto", "Helvetica Neue", sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText('Filgueira', cx, cy - subFontSize * 0.6);

  // "Imobiliária" — serif below (no letterSpacing — unsupported in Safari)
  ctx.font = `700 ${subFontSize}px Georgia, "Times New Roman", serif`;
  ctx.fillText('Imobiliária', cx, cy + mainFontSize * 0.45);

  ctx.restore();
}

export async function processImage(
  originalSrc: string,
  enhance: EnhanceSettings,
  watermark: WatermarkSettings,
): Promise<string> {
  const img = await loadImage(originalSrc);
  const { width, height } = clampDimensions(img.width, img.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img, 0, 0, width, height);
  applyEnhancements(ctx, width, height, enhance);
  drawTextWatermark(ctx, width, height, watermark);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export function dataURLtoBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new Blob([u8arr], { type: mime });
}
