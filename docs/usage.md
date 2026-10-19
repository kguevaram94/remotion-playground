# Uso

## Requisitos

- Node.js 18+
- npm
- Opcional: FFmpeg (`brew install ffmpeg`) para QC con ffprobe
- Opcional: `OPENAI_API_KEY` para IA / TTS
- Opcional: macOS `say` para voz local (`VOICE_PROVIDER=macos-say`)

```bash
cp .env.example .env
npm install
```

## Generar un Short

Procedimiento recomendado (voz, música, SFX, karaoke): **[generar-short.md](generar-short.md)**.

```bash
npm run generar-short -- "¿Puedes resolver el reto de los 9 puntos?"
```

Con topic o guion propio:

```bash
npm run generar-short -- --input data/topics/9-puntos.json
npm run generar-short -- --input data/templates/script-plantilla.json
```

Equivalente directo al CLI:

```bash
npm run short -- "¿Puedes resolver el reto de los 9 puntos?"
```

Sin APIs externas:

- `AI_PROVIDER=template` — plantillas locales
- `VOICE_PROVIDER=mock` — tono de prueba (marcado en pantalla y en el informe)

## Otros comandos

```bash
npm run short:script -- "Mueve una cerilla para corregir esta ecuación"
npm run short:render -- --input output/9-puntos/script.json
npm run short:preview -- --id 9-puntos
npm run short:studio-props -- --id 9-puntos   # props para Remotion Studio
npm run short:resume -- --id 9-puntos
npm run short:validate -- --id 9-puntos
npm run short:voice -- --id puntos --voice Paulina
npm run short:post -- --id puntos
npm test
npm run typecheck
npm run lint
npm run dev   # Remotion Studio (ShortVideo = plantilla logic-lateral por defecto)
```

Studio / preview (tres vías): [studio-preview.md](studio-preview.md).

Post-proceso genera `thumbnail.png`, `video-preview.mp4`, `frame-reveal.jpg` y `probe.json`.
Matriz de herramientas: [tooling.md](tooling.md).
Voces naturales / tu voz: [voice.md](voice.md).

## Salida

```text
output/<id>/
  input.json
  script.json
  scenes.json
  narration.wav
  subtitles.srt
  metadata.json
  report.json
  video.mp4
  voice-meta.json
  validation.json
  assets/
```

## Voz real en macOS

```bash
# .env
VOICE_PROVIDER=macos-say
```

## IA externa (OpenAI-compatible)

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-4o-mini
OPENAI_API_KEY=sk-...
```
