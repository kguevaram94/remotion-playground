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

1. Genera el guion del short.
2. Graba leyendo el texto:

```bash
brew install ffmpeg   # si no lo tienes
npm run short:record -- --id puntos
# Ctrl+C al terminar
```

O deja el archivo a mano: `output/puntos/narration.custom.wav`

3. Renderiza con ese audio:

```bash
VOICE_PROVIDER=file npm run short:voice -- --id puntos
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

## 4. Chatterbox local (fase 2A · provider Node)

Provider `chatterbox` invoca el CLI one-shot `tools/chatterbox/synthesize.py` (proceso efímero; sin daemon). **No** descarga pesos ni incluye la muestra vocal en el repo.

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

Requisitos locales: Python 3.11 + pins de `tools/chatterbox/requirements-pin.txt` + pack es-es fuera de Git. Ver `tools/chatterbox/README.md`. Config inválida con `VOICE_PROVIDER=chatterbox` **falla** (no cae a mock).

**Caché (fase 2B):** la clave de narración para Chatterbox incluye SHA-256 del **contenido** de `CHATTERBOX_REF_WAV`, una huella de los pins **declarados** en `requirements-pin.txt` (junto al CLI) y los parámetros de síntesis relevantes. Eso invalida la caché si cambian la ref o los pins declarados; **no** prueba que el venv instalado coincida con los pins ni que el audio final proceda de la ref. El parseo de pins es estricto: comentarios y líneas vacías se ignoran; líneas que no sean `name==version` y paquetes duplicados **fallan** (no se genera huella parcial). Otros providers conservan su clave previa. QC / `verified_provenance` / fase 2C: fuera de alcance.

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
