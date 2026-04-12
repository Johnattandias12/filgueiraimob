# Filgueira Imobiliária — Editor de Mídia

Ferramenta PWA de aprimoramento de fotos e vídeos com marca d'água para a Filgueira Imobiliária.
Roda 100% no navegador (client-side), sem backend próprio.

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| UI | shadcn-ui (Radix UI + Tailwind CSS) |
| Roteamento | React Router DOM v6 |
| Imagens | Canvas API (pixel-by-pixel) |
| Vídeos | FFmpeg.wasm (`@ffmpeg/ffmpeg 0.12`) |
| ZIP export | JSZip |
| Deploy | Vercel (SPA + cabeçalhos COOP/COEP para SharedArrayBuffer) |
| BaaS (futuro) | Supabase |
| PWA | vite-plugin-pwa (autoUpdate, workbox) |

---

## Arquitetura

```
src/
├── pages/
│   └── Index.tsx          — Página principal: todo o estado e orquestração
├── lib/
│   ├── imageEngine.ts     — Canvas: exposição, contraste, saturação, calor, marca d'água
│   └── videoEngine.ts     — FFmpeg.wasm: mesmos filtros + overlay de marca d'água PNG
├── components/
│   ├── UploadZone.tsx     — Drag-drop / seleção de arquivos
│   ├── ThumbnailStrip.tsx — Galeria horizontal de miniaturas
│   ├── BeforeAfterSlider  — Comparação antes/depois
│   ├── EnhanceControls    — Sliders de ajuste
│   ├── WatermarkControls  — Posição, tamanho, opacidade da marca d'água
│   └── ui/                — Componentes shadcn gerados
```

---

## Funcionalidades

- Upload de até 40 fotos/vídeos por sessão (drag-drop ou seletor)
- Ajustes: exposição, contraste, saturação, calor
- Botão "Magia": preset imobiliário (exposure+8, contrast-3, sat+10, warmth+12)
- Marca d'água "Filgueira Imobiliária" — 5 posições, tamanho e opacidade ajustáveis
- Processar arquivo individual ou todos em lote
- **Exportação em lote via ZIP** — baixa todos os arquivos processados em um único `.zip`
- **Compartilhamento nativo** (Web Share API) — individual ou todos de uma vez (WhatsApp, etc.)
- Slider before/after para imagens
- Preview de vídeo processado inline
- PWA instalável com suporte offline

---

## Limites conhecidos

| Tipo | Limite | Motivo |
|------|--------|--------|
| Arquivos por sessão | 40 | Memória do dispositivo |
| Canvas iOS (Safari) | 16 MP (~4000×4000) | Limite do WebKit |
| Vídeo máximo | 500 MB | FFmpeg.wasm em memória |
| Vídeo resolução | downscale para 1080p | Velocidade em mobile |
| FFmpeg wasm | ~25 MB de download | Core + WASM da CDN (unpkg) |

---

## Como rodar localmente

```bash
# 1. Instale dependências
npm install

# 2. Inicie o servidor de desenvolvimento
npm run dev
# → http://localhost:8080

# 3. Build de produção
npm run build

# 4. Preview do build
npm run preview
```

---

## Deploy no Vercel

1. Importe o repositório no [vercel.com](https://vercel.com)
2. Framework: **Vite** (detectado automaticamente)
3. Build command: `npm run build`
4. Output directory: `dist`
5. **Variáveis de ambiente**: copie `.env.example` → `.env.local` e preencha os valores do Supabase

> O `vercel.json` já configura os cabeçalhos `Cross-Origin-Opener-Policy` e `Cross-Origin-Embedder-Policy`
> necessários para o `SharedArrayBuffer` usado pelo FFmpeg.wasm.

---

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave pública (anon) do Supabase |

Todas as variáveis devem começar com `VITE_` para ficarem acessíveis no bundle do Vite.

---

## Supabase (integração futura)

O projeto está preparado para integrar o Supabase para:
- **Storage**: guardar mídias processadas na nuvem (`supabase storage`)
- **Auth**: login de corretores por e-mail/telefone
- **Database**: histórico de exportações por corretor

Para adicionar o cliente:
```bash
npm install @supabase/supabase-js
```

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
```

---

## Fluxo de exportação em lote

```
handleDownloadAll()
  │
  ├─ 1 arquivo → download direto (sem ZIP)
  │
  └─ 2+ arquivos
       ├─ import('jszip') — lazy load
       ├─ fetch() cada processedSrc (data: ou blob: URL)
       ├─ zip.file(`filgueira_<nome>.<ext>`, blob)
       ├─ zip.generateAsync({ compression: 'DEFLATE', level: 1 })
       ├─ URL.createObjectURL(zipBlob) → <a>.click()
       └─ fallback: download individual se JSZip falhar
```

---

## Filtros de imagem (Canvas API)

Aplicados pixel a pixel via `ImageData`:

```
pixel final = clamp(
  saturação(
    contraste(
      exposição(pixel original)
    ) + calor
  )
)
```

## Filtros de vídeo (FFmpeg filtergraph)

```
[0:v] scale → eq(brightness,contrast,saturation) → colorbalance(warmth) [colored]
[colored][1:v watermark.png] overlay=0:0 [out]
```

Codificação: `libx264 ultrafast CRF=20 yuv420p`, áudio `aac 128k`, `-movflags +faststart`.

---

## Decisões de design

- **Sem backend**: processamento no browser elimina custos de servidor e latência de upload
- **FFmpeg CDN**: o core WASM é carregado da CDN apenas quando o usuário processa o primeiro vídeo (lazy)
- **ZIP com compression level 1**: JPEG/MP4 já são comprimidos — nível 1 é suficiente e muito mais rápido que nível 9
- **Web Share API**: em mobile (iOS/Android) permite enviar direto ao WhatsApp/galeria sem passar pelo sistema de arquivos
- **Fallback para download individual**: se JSZip ou Share API falharem, o sistema degrada graciosamente
