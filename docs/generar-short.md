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

### Campo opcional `family` (contrato multiformato · entrega A)

El guion puede incluir `"family": "logic-lateral"` (u otra familia conocida). Si se omite, el pipeline **infiere** la familia (`format` + visuales). Familias desconocidas se rechazan con error explícito. No hace falta migrar plantillas existentes.

Familias registradas: `logic-lateral`, `logic-puzzle`, `math`, `memory`, `illusion`, `find-different`. El beat oficial de logic-lateral no cambia.

### Familia math (entrega B)

Plantilla: `data/templates/script-math.json`.

Beat propio: `hook` → `puzzle` → `countdown` → `explanation` → `reveal` → `outro` (CTA comentar).

```bash
cp data/templates/script-math.json data/topics/mi-reto-math.json
# editar id, title, expresión, narrations…
npm run generar-short -- --input data/topics/mi-reto-math.json
```

Validación: aritmética declarativa + coherencia `answerKey`↔reveal (`auto_validated` en la plantilla de referencia). Detalle: `docs/ARCHITECTURE.md` · D011–D012.

### Familia memory (entrega C · `accepted`)

Plantilla: `data/templates/script-memory.json`.

Beat propio: `hook` → `puzzle` → `countdown` → `hint` → `reveal` → `outro` (CTA comentar). Distinto de logic-lateral y de math; no modificar esos beats al editar memory.

Fases visuales (orden obligatorio): `show` → `hide` → `ask` → `reveal`.

**Cómo valida el acertijo** (`validateMemoryChallenge` + `validateMemoryNarrative`):

| Pieza | Rol |
| --- | --- |
| Fase `show` | Presenta el conjunto completo de elementos (`items`). El `missingId` **debe** estar entre ellos. |
| Fase `hide` | Oculta / transición (mismo contrato visual). |
| Fase `ask` | Plantea la pregunta mostrando solo los elementos restantes. Regla dura: `missingId` **no** puede aparecer en `items` de ask (el hueco es la pregunta). |
| Fase `reveal` | Revela la respuesta: `missingId` **vuelve** a estar en `items` (y coincide con el de ask). |
| `solution.answerKey` | Debe alinear `missingId` (y, si se declaran, `symbol` / `color`) con el elemento revelado. |

Sin LLM: la coherencia es declarativa (elementos presentados ↔ pregunta ↔ respuesta). Si `answerKey` falta o `type≠memory` → `partial`. Plantilla de referencia → `auto_validated`.

```bash
cp data/templates/script-memory.json data/topics/mi-reto-memory.json
npm run generar-short -- --input data/topics/mi-reto-memory.json
```

### Familia illusion (entrega D)

Plantilla: `data/templates/script-illusion.json`.

Beat propio: `hook` → `puzzle` → `countdown` → `explanation` → `reveal` → `outro` (CTA comentar). No altera beats de logic-lateral, math ni memory.

**Validación (siempre `partial` / `pending_review`, nunca `auto_validated`):**

| Pieza | Rol |
| --- | --- |
| Puzzle | `optical-illusion` con `compareMode=false` (pregunta perceptual). |
| Reveal | `compareMode=true` + `showGuides=true` (guías de comparación obligatorias). |
| Geometría | `shapes` declarados; Müller-Lyer exige ≥2 líneas; si `answerKey.lengthsEqual`, tamaños coherentes. |
| Status | Percepción subjetiva → revisión humana; la igualdad geométrica no basta para `auto_validated`. |

```bash
cp data/templates/script-illusion.json data/topics/mi-reto-illusion.json
npm run generar-short -- --input data/topics/mi-reto-illusion.json
```

Detalle: D014.

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

### Chatterbox local (opcional)

Si usas `VOICE_PROVIDER=chatterbox`, configura las variables locales en `.env` (ver [voice.md](voice.md)). El preflight de modos `full` / `resume` / `render` / `voice` exige `CHATTERBOX_PYTHON`, `CHATTERBOX_CKPT_DIR` y `CHATTERBOX_REF_WAV`; si faltan, el pipeline **falla de inmediato** (no cae a mock).

Cada segmento de narración es una invocación CLI (posible N× carga de modelo). Flujo: voz → loudnorm → render → QC. `verified_provenance` en el informe QC es la procedencia de **loudnorm** (bytes publicados), no la del modelo ni de los checkpoints. Detalle y límites: [voice.md](voice.md).

## 4. Qué incluye el formato automáticamente

| Pieza | Dónde |
| --- | --- |
| Narración por escena + silencio ~0,7s entre escenas | `generate-voice` + `narration-segments` |
| Subtítulos karaoke (frase fija, palabra en amarillo) | `SubtitleTrack` + `subtitle-sentences` |
| Música de fondo (catálogo curado `songs/catalog.json`) | `bg-music` → `ShortVideo` |
| SFX tick / whoosh / pop / ding (procedural) | `public/sfx/` + componentes Remotion |
| Narración loudnorm en el MP4 (no mock) | `narration-loudnorm` → render + `render-narration.json` (provenance) |
| Thumbnail + preview | post-proceso FFmpeg/Satori |

## 5. Estructura de salida

```text
output/<id>/
  script.json
  scenes.json
  narration.wav
  narration-loudnorm.wav   # si voz no-mock; generada antes del render
  render-narration.json    # provenance (kind+sha1) del audio publicado a Remotion
  voice-meta.json
  subtitles.srt
  video.mp4
  video-preview.mp4
  thumbnail.png
  report.json              # QC técnico + publishEligibility (no solo existencia del MP4)
```

### QC técnico vs elegibilidad de publicación

| Campo | Significado |
| --- | --- |
| `report.ok` | QC **técnico** del job. Con voz real, loudnorm obligatorio (provenance `kind=loudnorm`); si falla → blocking y fase `quality_check` failed. Mock (`mock_omitted`) puede pasar si no hay otros bloqueos. |
| `report.publishEligibility.eligible` | Gate **automático** de publicación. Mock **nunca** elegible. Voz real solo si QC técnico OK + loudnorm verificado. |
| `publishEligibility.reasons` | Motivos si `eligible=false` (p. ej. `audio_mock`, `mock_omitted`, `narration_loudnorm:failed`, `technical_qc_failed`). |

`eligible=true` significa que pasaron los controles automáticos definidos. **No** equivale a una validación audiovisual humana ni demuestra que se haya inspeccionado el audio del contenedor MP4. La sola existencia de `video.mp4` no hace el job publicable.

Catálogo BGM vacío: warning esperado; no bloquea QC ni elegibilidad por defecto.

### Revalidar jobs antiguos (sin migración automática)

Jobs `completed` antes de este gate **no** se reevalúan solos. Si falta provenance válida o el QC antiguo solo avisaba:

```bash
# Invalidar QC (y post si hace falta) y volver a correr
# Opción A — solo post + QC (si el render ya publicó loudnorm con provenance):
npm run short:post -- --id <id>

# Opción B — regenerar voz → subtítulos → render → post → QC:
npm run short -- --id <id> --mode voice
```

Si `quality_check` ya está `done` con un informe antiguo, `resume` no lo reabre: usa `short:post` o `mode voice` (invalidan fases posteriores). Revisa `output/<id>/report.json` (`ok`, `blocking`, `publishEligibility`).

## 6. Checklist de calidad

- [ ] Beat completo: hook → rules → countdown → steps → reveal → outro
- [ ] Outro pide comentar (voz + texto en pantalla)
- [ ] No sale el banner «AUDIO DE PRUEBA»
- [ ] Si hay pistas en `songs/catalog.json`, hay música de fondo (bajo la voz); si el catálogo está vacío, el warning de BGM es esperado
- [ ] Countdown suena tick; revelación suena ding/whoosh
- [ ] Sin banner de prueba: la narración del MP4 es loudnorm (no mock)
- [ ] `report.ok=true` y, si se pretende publicar, `publishEligibility.eligible=true`
- [ ] Subtítulos: frase completa visible; solo la palabra activa cambia de color
- [ ] Tras cada escena hay una pausa breve antes de seguir leyendo
- [ ] Solución validada (`validation.ok`; three-switches suele ser `partial`)

## 7. Problemas frecuentes

| Síntoma | Qué hacer |
| --- | --- |
| Voz robótica / tono beep | `VOICE_PROVIDER=openai-tts` + `OPENAI_API_KEY` (o Chatterbox local; ver [voice.md](voice.md)) |
| Misma voz antigua tras cambiar `.env` | `npm run short -- --id <id> --mode voice` |
| Fallo temprano `VOICE_PROVIDER=chatterbox requiere…` | Completa `CHATTERBOX_PYTHON` / `CKPT_DIR` / `REF_WAV` en `.env` |
| QC falla por loudnorm / sin provenance | Regenerar con `--mode voice` (loudnorm antes del render) o `short:post` si ya hay provenance |
| `eligible=false` con mock | Esperado: no publicar audio de prueba |
| Sin música | Añade pista **con licencia** a `songs/catalog.json` (ver README) y vuelve a renderizar |
| Sin SFX | `npm run sfx:generate` y `--mode render` |
| Guion inválido | `npm run short:validate -- --id <id>` |
| Bloqueo `pending_review` / `partial` | `SHORTS_HUMAN_REVIEW_POLICY=warn_and_continue` |

Más detalle: [usage.md](usage.md) · [voice.md](voice.md) · [openai-tts.md](openai-tts.md).
