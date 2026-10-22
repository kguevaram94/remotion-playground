# Voces naturales (y tu propia voz)

Las voces de macOS `say` (Mónica, Flo, Sandy…) **siempre suenan sintéticas**. Para narración de Shorts con entonación natural hay tres caminos:

## 1. OpenAI TTS (recomendado: natural, sin clonar)

Requiere `OPENAI_API_KEY`.

```bash
# .env
VOICE_PROVIDER=openai-tts
VOICE_TTS_MODEL=gpt-4o-mini-tts
VOICE_NAME=coral          # coral | nova | sage | ash | ballad | …
# opcional:
# VOICE_INSTRUCTIONS=Habla en español de España, enérgico y natural…
```

```bash
npm run short:voice -- --id puntos
```

Voces OpenAI útiles: `coral`, `nova`, `sage`, `ash`, `ballad`, `shimmer`.

## 2. Tu propia voz grabada (100 % nativa, gratis)

`VOICE_PROVIDER=file` acepta **solo WAV PCM** (RIFF/WAVE, `audioFormat=1`). MP3/AIFF u otros códecs no se aceptan: conviértelos antes a PCM WAV. La duración y el sample rate se leen del archivo (no se estiman desde el texto).

1. Genera el guion del short.
2. Graba leyendo el texto:

```bash
brew install ffmpeg   # si no lo tienes
npm run short:record -- --id puntos
# Ctrl+C al terminar
```

O deja el archivo a mano: `output/puntos/narration.custom.wav` (PCM WAV).

3. Renderiza con ese audio:

```bash
VOICE_PROVIDER=file npm run short:voice -- --id puntos
# o: VOICE_PROVIDER=file VOICE_FILE=/ruta/a/narracion.wav …
```

## 3. Clonar tu voz (ElevenLabs)

Ideal si quieres **tu timbre** en todos los vídeos sin grabar cada uno.

1. Graba 30 s–2 min limpios → `data/voices/me.wav`
2. Cuenta en [elevenlabs.io](https://elevenlabs.io) → API key
3. Clona:

```bash
# .env
ELEVENLABS_API_KEY=...

npm run short:clone-voice -- --sample data/voices/me.wav --name "Kevin" --save-env
```

4. Regenera:

```bash
VOICE_PROVIDER=elevenlabs npm run short:voice -- --id puntos
```

## 4. Chatterbox local (pipeline · fases 2A–2C)

Provider `chatterbox` invoca el CLI one-shot `tools/chatterbox/synthesize.py` (proceso efímero; **sin daemon**). **No** descarga pesos ni incluye la muestra vocal en el repo.

```bash
# .env (rutas locales — placeholders; sin /Users/... por defecto)
VOICE_PROVIDER=chatterbox
CHATTERBOX_PYTHON=/path/to/chatterbox-venv/bin/python
CHATTERBOX_SCRIPT=tools/chatterbox/synthesize.py
CHATTERBOX_CKPT_DIR=/path/to/local/es-es-checkpoints
CHATTERBOX_REF_WAV=/path/to/local/ref.wav
CHATTERBOX_DEVICE=auto          # auto | mps | cpu | cuda (mps/cuda sin fallback silencioso a CPU)
CHATTERBOX_TIMEOUT_MS=300000    # dedicado; no reutiliza SHORTS_REQUEST_TIMEOUT_MS
```

Requisitos locales: Python 3.11 + pins de `tools/chatterbox/requirements-pin.txt` + pack es-es fuera de Git. Ver `tools/chatterbox/README.md`.

### Preflight (fase 2C · H1)

En modos que requieren voz (`full`, `resume`, `render`, `voice`), `assertConfigForMode` valida **el provider configurado** (no solo `openai-tts`):

| Provider | Qué exige el preflight |
| --- | --- |
| `chatterbox` | `CHATTERBOX_PYTHON`, `CHATTERBOX_CKPT_DIR`, `CHATTERBOX_REF_WAV` |
| `openai-tts` | `OPENAI_API_KEY` / `VOICE_API_KEY` |
| `elevenlabs` | `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` |
| `file` / `macos-say` / `mock` | sin secretos obligatorios en preflight |

Config incompleta con `VOICE_PROVIDER=chatterbox` **falla de forma explícita** y **nunca** degrada a mock. Modos sin voz (`script`, `validate`, `post`, `preview`) no exigen esas variables.

### Flujo de extremo a extremo

```text
preflight (assertConfigForMode)
  → generate-voice (N× CLI Chatterbox si hay N segmentos)
  → narration.wav + voice-meta.json
  → ensureNarrationLoudnorm → narration-loudnorm.wav
  → subtítulos → render (publica bytes loudnorm; write render-narration.json)
  → post → QC (provenance loudnorm) → publishEligibility
```

Artefacto WAV (contrato provider): PCM16, mono, **24 kHz**.

### Coste por segmento (cold start)

Cada segmento de narración (cambio de escena / párrafo) es una **invocación CLI independiente**: carga de modelo + checkpoints + generate + write. Con N segmentos ≈ **N× cold-start** (tiempo y memoria). No hay daemon persistente en el alcance actual; la caché de job evita re-síntesis solo si la clave de narración coincide.

### Caché (fase 2B) y límites de trazabilidad

La clave de narración para Chatterbox incluye SHA-256 del **contenido** de `CHATTERBOX_REF_WAV`, una huella de los pins **declarados** en `requirements-pin.txt` (junto al CLI) y los parámetros de síntesis relevantes. Eso invalida la caché si cambian la ref o los pins declarados; **no** prueba que el venv instalado coincida con los pins ni que el audio final proceda de la ref. El parseo de pins es estricto: comentarios y líneas vacías se ignoran; líneas que no sean `name==version` y paquetes duplicados **fallan** (no se genera huella parcial). Otros providers conservan su clave previa.

**Artefactos vs metadatos:**

| Qué | Significado |
| --- | --- |
| `narration.wav` / `narration-loudnorm.wav` | Bytes generados en el job |
| `voice-meta.json` | Metadatos declarativos de la corrida (provider, segmentos, cues) |
| `render-narration.json` | Provenance de **qué bytes** se publicaron al render (kind + sha1) |
| Pins / ref / device en la clave de caché | Identidad de **configuración declarada** — no prueba criptográfica del modelo ni del venv |

### Glosario: `verified_provenance` ≠ procedencia del modelo

En este repo, `verified_provenance` (QC P5 / `T-QC-LOUDNORM-001`) significa: el render publicó los **bytes exactos** de `narration-loudnorm.wav` (sha1 + `kind=loudnorm` en `render-narration.json`).

**No** significa:

- procedencia verificada del modelo Chatterbox / HF
- integridad de checkpoints o del pack es-es
- que la referencia vocal sea la “correcta” o personal
- que el venv Python coincida con `requirements-pin.txt`
- hash de pesos o auditoría Perth / `conds.pt`

Esas reservas (fase 1 I-R*/M-R*, reserva técnica 2A, limitaciones 2B) siguen **abiertas**. Ver `tasks/approvals.md`.

### Verificación en CI / fase 2C

Las pruebas de integración de fase 2C usan **provider simulado + fixtures** (sin inferencia real, sin descargas de modelos, sin render MP4 real obligatorio). No afirmar éxito de inferencia o audio real a partir de esas suites.

## Comparativa

| Opción | Calidad | Tu voz | Coste |
| --- | --- | --- | --- |
| macOS `say` | Baja (robótica) | No | Gratis |
| OpenAI TTS | Alta, con entonación | No | API |
| Archivo grabado | Máxima (eres tú) | Sí | Gratis |
| ElevenLabs clone | Alta + tu timbre | Sí | API |
| Chatterbox local | Clonación local (piloto) | Sí (ref local) | Gratis (compute local) |

## macOS “Personal Voice”

En Ajustes → Accesibilidad → Voz personal puedes entrenar una voz del sistema. Si aparece en `say -v '?'`, úsala con `VOICE_PROVIDER=macos-say` y `VOICE_MODEL=<nombre>`. Suele requerir mucho entrenamiento y no iguala a OpenAI/ElevenLabs.
