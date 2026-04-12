/**
 * Gera favicon.svg, favicon.ico (32x32), icon-192.png e icon-512.png
 * com o ícone geométrico "F" da Filgueira Imobiliária.
 *
 * Uso: node scripts/generate-icons.mjs
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');

// Cor primária (mesma do Tailwind config — hsl(195 100% 50%) ≈ #00BFFF era o original,
// mas usamos o roxo/violeta do tema dark: hsl(270 80% 55%) ≈ #7C3AED)
const PRIMARY = '#7C3AED';

/**
 * Gera o SVG do ícone F em qualquer tamanho.
 * Todas as medidas são relativas a um viewBox 36x36.
 */
function makeSVG(size = 36) {
  const s = size / 36;
  const r = Math.round(8 * s);
  // Barras do F
  const vx = Math.round(10 * s), vy = Math.round(9 * s), vw = Math.round(3.5 * s), vh = Math.round(18 * s);
  const tx = Math.round(10 * s), ty = Math.round(9 * s), tw = Math.round(16 * s), th = Math.round(3.5 * s);
  const mx = Math.round(10 * s), my = Math.round(16.2 * s), mw = Math.round(12 * s), mh = Math.round(3 * s);
  const br = Math.max(1, Math.round(1.5 * s));

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${r}" fill="${PRIMARY}"/>
  <rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" rx="${br}" fill="white"/>
  <rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="${br}" fill="white"/>
  <rect x="${mx}" y="${my}" width="${mw}" height="${mh}" rx="${br}" fill="white"/>
</svg>`;
}

async function main() {
  // 1. favicon.svg — para browsers modernos (melhor qualidade, escalável)
  const svgPath = path.join(PUBLIC, 'favicon.svg');
  fs.writeFileSync(svgPath, makeSVG(36));
  console.log('✓ favicon.svg');

  // 2. favicon-32.png — para conversão em .ico
  const svg32 = Buffer.from(makeSVG(32));
  const png32Path = path.join(PUBLIC, 'favicon-32.png');
  await sharp(svg32, { density: 144 }).resize(32, 32).png().toFile(png32Path);
  console.log('✓ favicon-32.png');

  // 3. favicon.ico — 32x32 para compatibilidade máxima
  //    (sharp não gera .ico nativamente; copiamos o PNG e referenciamos os dois no HTML)
  const icoPath = path.join(PUBLIC, 'favicon.ico');
  await sharp(svg32, { density: 144 }).resize(32, 32).png().toFile(icoPath.replace('.ico', '-tmp.png'));
  // Reusa o PNG como .ico (browsers modernos aceitam PNG dentro de .ico)
  fs.copyFileSync(icoPath.replace('.ico', '-tmp.png'), icoPath);
  fs.unlinkSync(icoPath.replace('.ico', '-tmp.png'));
  console.log('✓ favicon.ico (PNG encapsulado)');

  // 4. icon-192.png — PWA Android / manifest
  const svg192 = Buffer.from(makeSVG(192));
  await sharp(svg192, { density: 144 }).resize(192, 192).png().toFile(path.join(PUBLIC, 'icon-192.png'));
  console.log('✓ icon-192.png');

  // 5. icon-512.png — PWA splash screen
  const svg512 = Buffer.from(makeSVG(512));
  await sharp(svg512, { density: 144 }).resize(512, 512).png().toFile(path.join(PUBLIC, 'icon-512.png'));
  console.log('✓ icon-512.png');

  // 6. apple-touch-icon.png — 180x180 para iOS
  const svg180 = Buffer.from(makeSVG(180));
  await sharp(svg180, { density: 144 }).resize(180, 180).png().toFile(path.join(PUBLIC, 'apple-touch-icon.png'));
  console.log('✓ apple-touch-icon.png');

  console.log('\nTodos os ícones gerados com sucesso!');
}

main().catch(e => { console.error(e); process.exit(1); });
