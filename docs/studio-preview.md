# Studio y preview — workflow estable (P7)

Tres vías distintas. No las mezcles:

| Vía | Comando | Qué es | Cuándo usarla |
| --- | --- | --- | --- |
| **Remotion Studio** | `npm run dev` | Editor interactivo de la composición `ShortVideo` | Iterar visuales / timing sin render completo |
| **CLI preview** | `npm run short:preview -- --id <id>` | Render Remotion a escala `SHORTS_PREVIEW_SCALE` (default 0.5) → MP4 | Comprobar el short de un job a media resolución |
| **Preview post-proceso** | generado en `post` | `output/<id>/video-preview.mp4` (FFmpeg, ligero) | Compartir / revisar rápido tras un render full |

Ninguna de estas vías publica a YouTube (P8 `blocked`).

## 1. Remotion Studio

```bash
npm run dev
```

1. Abre el Studio en el navegador.
2. Elige la composición **`ShortVideo`** (no hace falta tocar `HelloRemotion` ni `ScriptVideo`).
3. Por defecto carga la plantilla oficial `data/templates/script-logic-lateral.json` (**solo visual**, sin narración ni BGM).

### Cargar un job real en Studio

Si ya tienes un trabajo en `output/<id>/`:

```bash
npm run short:studio-props -- --id s4-19-interruptores
npx remotion studio --props=output/s4-19-interruptores/studio-props.json
```

El JSON incluye `script`, subtítulos (si hay SRT) y rutas `public/` de audio/música **si** existen bajo `public/shorts/<id>/`.

**Dependencia de audio:** narración y BGM en Studio **solo** funcionan si los archivos están publicados en `public/shorts/<id>/` (p. ej. `narration-*.wav`, `bg.mp3`). Sin esos archivos, Studio va mudo aunque exista `output/<id>/`. Eso es esperado.

### Otras familias (math / memory / illusion)

Studio no cambia de familia solo: o editas props en el panel, o generas `studio-props` desde un job de esa familia, o sustituyes temporalmente el default (no recomendado en commits). Los beats oficiales no se alteran desde Studio.

## 2. CLI preview (`short:preview`)

Requiere un job con `script.json` (idealmente ya validado / con voz):

```bash
npm run short:preview -- --id <id>
```

- Usa el mismo pipeline de render que `short:render`, con escala `SHORTS_PREVIEW_SCALE` (ver `.env.example`).
- Escribe un MP4 de preview en el directorio del job (vía modo `preview` del CLI).
- **No** sustituye la inspección audiovisual humana de aceptación de fases.

## 3. Preview post-proceso (`video-preview.mp4`)

Tras un render full + `post`:

```text
output/<id>/
  video.mp4           # final
  video-preview.mp4   # FFmpeg half-res / CRF alto
  thumbnail.png
  …
```

Sirve para revisión rápida o envío; el artefacto canónico de producción sigue siendo `video.mp4`.

## Checklist rápido

- [ ] Visuales: Studio (`npm run dev`) o props de job.
- [ ] Preview a media res del job: `short:preview`.
- [ ] MP4 social lite: `video-preview.mp4` tras post.
- [ ] Validación de acertijo: `short:validate` / `--mode validate` (independiente del Studio).

## Relacionado

- [usage.md](usage.md) — comandos generales
- [generar-short.md](generar-short.md) — pipeline de producción
- [tooling.md](tooling.md) — FFmpeg / Remotion
- [troubleshooting.md](troubleshooting.md) — fallos habituales
- Decisión D015 en [DECISIONS.md](DECISIONS.md)
