// Canvas-based image processing engine for real estate photos
// All processing happens client-side for zero server costs

export interface EnhanceSettings {
  exposure: number;    // -100 to 100
  contrast: number;    // -100 to 100
  saturation: number;  // -100 to 100
  warmth: number;      // -100 to 100
}

export interface WatermarkSettings {
  enabled: boolean;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  size: number;    // 5 to 50 (% of image width)
  opacity: number; // 0 to 100
}

export const DEFAULT_ENHANCE: EnhanceSettings = {
  exposure: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
};

export const REAL_ESTATE_MAGIC: EnhanceSettings = {
  exposure: 12,
  contrast: 15,
  saturation: 20,
  warmth: 5,
};

export const DEFAULT_WATERMARK: WatermarkSettings = {
  enabled: true,
  position: 'bottom-right',
  size: 20,
  opacity: 70,
};

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export function applyEnhancements(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: EnhanceSettings
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const exposureFactor = 1 + settings.exposure / 100;
  const contrastFactor = (259 * (settings.contrast * 2.55 + 255)) / (255 * (259 - settings.contrast * 2.55));
  const satFactor = 1 + settings.saturation / 100;
  const warmthShift = settings.warmth * 0.5;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Exposure
    r = Math.min(255, r * exposureFactor);
    g = Math.min(255, g * exposureFactor);
    b = Math.min(255, b * exposureFactor);

    // Contrast
    r = Math.min(255, Math.max(0, contrastFactor * (r - 128) + 128));
    g = Math.min(255, Math.max(0, contrastFactor * (g - 128) + 128));
    b = Math.min(255, Math.max(0, contrastFactor * (b - 128) + 128));

    // Saturation (luminance-based)
    const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = Math.min(255, Math.max(0, gray + satFactor * (r - gray)));
    g = Math.min(255, Math.max(0, gray + satFactor * (g - gray)));
    b = Math.min(255, Math.max(0, gray + satFactor * (b - gray)));

    // Warmth (shift red up, blue down)
    r = Math.min(255, Math.max(0, r + warmthShift));
    b = Math.min(255, Math.max(0, b - warmthShift));

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  logoImg: HTMLImageElement,
  settings: WatermarkSettings
) {
  if (!settings.enabled) return;

  const logoWidth = (canvasWidth * settings.size) / 100;
  const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
  const padding = canvasWidth * 0.03;

  let x: number, y: number;

  switch (settings.position) {
    case 'top-left':
      x = padding; y = padding; break;
    case 'top-right':
      x = canvasWidth - logoWidth - padding; y = padding; break;
    case 'bottom-left':
      x = padding; y = canvasHeight - logoHeight - padding; break;
    case 'bottom-right':
      x = canvasWidth - logoWidth - padding; y = canvasHeight - logoHeight - padding; break;
    case 'center':
      x = (canvasWidth - logoWidth) / 2; y = (canvasHeight - logoHeight) / 2; break;
  }

  ctx.save();
  ctx.globalAlpha = settings.opacity / 100;
  ctx.drawImage(logoImg, x, y, logoWidth, logoHeight);
  ctx.restore();
}

export async function processImage(
  originalSrc: string,
  enhance: EnhanceSettings,
  watermark: WatermarkSettings,
  logoSrc: string | null
): Promise<string> {
  const img = await loadImage(originalSrc);
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img, 0, 0);
  applyEnhancements(ctx, img.width, img.height, enhance);

  if (watermark.enabled && logoSrc) {
    try {
      const logoImg = await loadImage(logoSrc);
      drawWatermark(ctx, img.width, img.height, logoImg, watermark);
    } catch (e) {
      console.warn('Failed to load watermark logo:', e);
    }
  }

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
