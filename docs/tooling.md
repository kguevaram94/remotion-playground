# Herramientas de animación / media — qué usamos y por qué

Remotion exige animaciones **deterministas por fotograma** (`useCurrentFrame`). Cualquier librería basada en reloj de pared (`requestAnimationFrame`, timelines en ms reales) rompe el render en servidor.

## Decisión

| Herramienta | ¿Integrada? | Motivo |
| --- | --- | --- |
| **Remotion Skills / best practices** | Sí (docs + skill del repo) | Fuente de verdad para animar y renderizar |
| **@remotion/paths** | Sí | SVG paths: `evolvePath` para agua/tuberías, trazos |
| **FFmpeg** (`npx remotion ffmpeg/ffprobe` o sistema) | Sí | Post-proceso: preview, frames, loudnorm, QC |
| **Satori** + **resvg** | Sí | Thumbnails PNG sin Chromium extra |
| **@remotion/transitions** | Disponible | Preferimos `SceneFade` nativo (más simple para Shorts) |
| **Three.js / R3F / @remotion/three** | Preparado, no activo | Útil para ilusiones 3D futuras; `gl: angle` ya configurado |
| **Rive / @remotion/rive** | Stub opcional | Solo si hay assets `.riv`; no necesario para acertijos SVG |
| **GSAP / @remotion/gsap** | No | Oficialmente compatible, pero `spring`/`interpolate` bastan aquí |
| **Anime.js** | No | Integración no oficial / frágil |
| **Motion Canvas** | No | Motor paralelo a Remotion; duplicaría la fábrica |

## Flujo optimizado

```text
guion → validación → voz (+ loudnorm narración) → SRT
      → Remotion render (usa WAV loudnorm si no es mock; bundle cache)
      → post-proceso FFmpeg+Satori → QC ffprobe → output/
```

Artefactos nuevos por trabajo:

- `thumbnail.png` — portada vertical (Satori; tipografía/badge/hook pulidos)
- `frame-reveal.jpg` — fotograma cerca de la revelación
- `video-preview.mp4` — preview ligero
- `narration-loudnorm.wav` — narración normalizada **antes del render** (si no es mock); el MP4 embebe esta pista
- `probe.json` — metadatos ffprobe

BGM: solo pistas en `songs/catalog.json` (ver `songs/README.md`). Sin catálogo curado → warning y vídeo sin música.

## Comandos

```bash
npm run short:post -- --id puntos          # solo FFmpeg + Satori
npm run short:voice -- --id puntos --voice Paulina
npx remotion ffmpeg -i output/puntos/video.mp4
npx remotion ffprobe output/puntos/video.mp4
```

## Cuándo añadir Three.js o Rive

- **Three.js**: profundidad 3D real (p. ej. ilusión de habitación de Ames).
- **Rive**: character loops / UI motion diseñados en el editor Rive.

Hasta entonces, SVG + `spring`/`interpolate` + `SceneFade` es más rápido de renderizar y más fácil de validar.
