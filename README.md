# Filgueira Imobiliária — Editor de Mídia

PWA para aprimoramento de fotos e vídeos imobiliários com marca d'água.  
Processamento 100% no navegador, sem upload para servidor.

## Funcionalidades

- Upload de até 40 fotos/vídeos por sessão
- Ajustes de exposição, contraste, saturação e calor
- Botão "Magia" com preset imobiliário otimizado
- Marca d'água "Filgueira Imobiliária" configurável (posição, tamanho, opacidade)
- Processamento em lote de todas as mídias
- **Exportação em lote via ZIP** — um único arquivo com todas as mídias processadas
- **Compartilhamento nativo** (WhatsApp, galeria) via Web Share API — individual ou em lote
- Slider antes/depois para comparação de imagens
- Instalável como PWA (funciona offline)

## Tecnologias

- React 18 + TypeScript + Vite
- Canvas API (imagens) / FFmpeg.wasm (vídeos)
- JSZip (exportação em lote)
- shadcn-ui + Tailwind CSS
- Deploy: Vercel | BaaS: Supabase

## Desenvolvimento local

```bash
npm install
npm run dev        # http://localhost:8080
npm run build      # build de produção
npm run preview    # preview do build
```

## Deploy

Ver [CLAUDE.md](./CLAUDE.md) para instruções detalhadas de deploy no Vercel e integração com Supabase.
