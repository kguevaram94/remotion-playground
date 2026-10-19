---
name: remotion-shorts
description: Best practices for the Remotion Shorts factory in this repo. Use when editing ShortVideo, pipeline phases, animations, FFmpeg post-process, or adding animation libraries.
---

# Remotion Shorts — skill del repo

## Formato oficial: logic-lateral

Referencia: `output/s4-19-interruptores/` · plantilla: `data/templates/script-logic-lateral.json`.

Beat: `hook` → `rules` → `countdown` → `explanation` → `reveal` → `outro` (CTA comentar).

Visuales: `logic-room`, `switch-sequence`, `bulb-state-reveal` (+ `countdown`, `text`).

```bash
cp data/templates/script-logic-lateral.json data/topics/mi-reto.json
npm run generar-short -- --input data/topics/mi-reto.json
```

Builder automático (título con interruptor/bombilla): `src/shorts/templates/three-switches.ts`.

## Reglas de oro

1. Toda animación depende de `useCurrentFrame()` / `interpolate` / `spring`.
2. Datos declarativos en JSON; componentes en `src/shorts/remotion/components/`.
3. No añadir GSAP, Anime.js o Motion Canvas sin integración oficial frame-sync y justificación.
4. FFmpeg/Satori van en **post-proceso**, no dentro de la composición.
5. No romper `HelloRemotion` ni `ScriptVideo`.
6. Outro logic-lateral siempre pide comentar.

## Dónde tocar

| Cambio | Archivo |
| --- | --- |
| Nueva escena visual | `components/` + rama en `ShortVideo.tsx` + schema |
| Plantilla / detección | `src/shorts/templates/` + `select.ts` |
| Pipeline | `src/shorts/pipeline/` |
| Thumbnail | `src/shorts/media/thumbnail.ts` |
| FFmpeg | `src/shorts/media/ffmpeg.ts` |
| Render opts | `render-video.ts` (`gl: angle`, bundle cache) |

## Referencia externa

- https://www.remotion.dev/docs/third-party
- https://www.remotion.dev/docs/ffmpeg
- https://www.remotion.dev/docs/three
- https://www.remotion.dev/docs/rive
