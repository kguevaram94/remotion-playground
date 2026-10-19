# Generar un Short (formato logic-lateral)

Procedimiento para producir un vídeo nuevo con el mismo formato que `output/s4-19-interruptores/video.mp4`:

**Beat de escenas (oficial):**

`hook` → `instruction` (reglas) → `countdown` → `explanation` (pasos) → `reveal` → `outro` (CTA a comentar)

**Stack de producción:**

- Voz OpenAI TTS (entonación natural) + loudnorm de narración embebido en el MP4
- Música de fondo **solo** desde pistas curadas en `songs/catalog.json` (ver `songs/README.md`)
- SFX procedurales (`npm run sfx:generate`) en countdown, pasos, hook y revelación
- Subtítulos karaoke: frase fija en pantalla + palabra activa resaltada
- Pausas solo entre escenas/párrafos (no tras cada punto y seguido)

Visuales tipados del formato: `logic-room`, `switch-sequence`, `bulb-state-reveal`, `countdown`, `text` (outro).

## 0. Preparación (una vez)

```bash
cp .env.example .env
# Edita .env — mínimo recomendado:
#   OPENAI_API_KEY=sk-...
#   VOICE_PROVIDER=openai-tts
#   VOICE_TTS_MODEL=gpt-4o-mini-tts
#   VOICE_NAME=onyx
#   VOICE_INSTRUCTIONS_FILE=data/voices/instructions-andaluz.txt
#   SHORTS_HUMAN_REVIEW_POLICY=warn_and_continue

npm install
npm run sfx:generate          # public/sfx/*.wav (si no existen)
# BGM: solo pistas listadas en songs/catalog.json con licencia verificable
# (ver songs/README.md). Sin entradas curadas → short sin música.
```

Comprueba:

```bash
test -f .env && test -f songs/catalog.json && test -f public/sfx/tick.wav && echo OK
```

## 1. Flujo recomendado (guion propio)

Plantilla oficial: `data/templates/script-logic-lateral.json`.

```bash
cp data/templates/script-logic-lateral.json data/topics/mi-reto.json
# …edita id, title, narrations, visuals (mantén el beat y el CTA a comentar)…

npm run generar-short -- --input data/topics/mi-reto.json
```

Referencia completa: `data/topics/s4-19-interruptores.json`.

Topic stub: `data/topics/_plantilla-logic-lateral.json`.

> Variante nine-dots (cuadrícula): sigue en `data/templates/script-plantilla.json` / `output/puntos/`.

## 2. Solo título (plantilla automática)

La fábrica detecta el formato por título y genera guion (p. ej. interruptores/bombilla → three-switches).

```bash
npm run generar-short -- "Tres interruptores y una bombilla: ¿cuál la enciende?"
# nine-dots:
npm run generar-short -- "¿Puedes resolver el reto de los 9 puntos?"
```

Salida: `output/<id-slug>/video.mp4`.

## 3. Regenerar solo voz / subtítulos / vídeo

```bash
npm run short -- --id s4-19-interruptores --mode voice
npm run short -- --id s4-19-interruptores --mode render
```

## 4. Qué incluye el formato automáticamente

| Pieza | Dónde |
| --- | --- |
| Narración por escena + silencio ~0,7s entre escenas | `generate-voice` + `narration-segments` |
| Subtítulos karaoke (frase fija, palabra en amarillo) | `SubtitleTrack` + `subtitle-sentences` |
| Música de fondo (catálogo curado `songs/catalog.json`) | `bg-music` → `ShortVideo` |
| SFX tick / whoosh / pop / ding (procedural) | `public/sfx/` + componentes Remotion |
| Narración loudnorm en el MP4 (no mock) | `narration-loudnorm` → render |
| Thumbnail + preview | post-proceso FFmpeg/Satori |

## 5. Estructura de salida

```text
output/<id>/
  script.json
  scenes.json
  narration.wav
  narration-loudnorm.wav   # si voz no-mock; usada en el render
  voice-meta.json
  subtitles.srt
  video.mp4
  video-preview.mp4
  thumbnail.png
  report.json
```

## 6. Checklist de calidad

- [ ] Beat completo: hook → rules → countdown → steps → reveal → outro
- [ ] Outro pide comentar (voz + texto en pantalla)
- [ ] No sale el banner «AUDIO DE PRUEBA»
- [ ] Si hay pistas en `songs/catalog.json`, hay música de fondo (bajo la voz); si el catálogo está vacío, el warning de BGM es esperado
- [ ] Countdown suena tick; revelación suena ding/whoosh
- [ ] Sin banner de prueba: la narración del MP4 es loudnorm (no mock)
- [ ] Subtítulos: frase completa visible; solo la palabra activa cambia de color
- [ ] Tras cada escena hay una pausa breve antes de seguir leyendo
- [ ] Solución validada (`validation.ok`; three-switches suele ser `partial`)

## 7. Problemas frecuentes

| Síntoma | Qué hacer |
| --- | --- |
| Voz robótica / tono beep | `VOICE_PROVIDER=openai-tts` + `OPENAI_API_KEY` |
| Misma voz antigua tras cambiar `.env` | `npm run short -- --id <id> --mode voice` |
| Sin música | Añade pista **con licencia** a `songs/catalog.json` (ver README) y vuelve a renderizar |
| Sin SFX | `npm run sfx:generate` y `--mode render` |
| Guion inválido | `npm run short:validate -- --id <id>` |
| Bloqueo `pending_review` / `partial` | `SHORTS_HUMAN_REVIEW_POLICY=warn_and_continue` |

Más detalle: [usage.md](usage.md) · [voice.md](voice.md) · [openai-tts.md](openai-tts.md).
