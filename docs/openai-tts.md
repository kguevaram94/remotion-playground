# Guía: OpenAI TTS en este proyecto

Narración con entonación natural (español) para Shorts. Sustituye a macOS `say`.

## 1. Crear clave API

1. Entra en [platform.openai.com](https://platform.openai.com)
2. Crea cuenta / inicia sesión
3. Añade método de pago (Billing) — TTS no es gratis
4. **API keys** → Create new secret key → cópiala (`sk-...`)

Coste aproximado: céntimos por Short de ~30 s (modelo `gpt-4o-mini-tts`).

## 2. Configurar el proyecto

En la raíz del repo, edita `.env` (créalo desde `.env.example` si no existe):

```bash
VOICE_PROVIDER=openai-tts
OPENAI_API_KEY=sk-tu-clave-aqui

# Modelo con instrucciones de estilo (recomendado)
VOICE_TTS_MODEL=gpt-4o-mini-tts

# Voz del locutor
VOICE_NAME=coral

# Velocidad (1.0 = normal; Shorts ~1.2–1.3)
VOICE_SPEED=1.25
```

Opcional — estilo de habla:

```bash
VOICE_INSTRUCTIONS=Habla en español de España, como un presentador de YouTube Shorts. Entonación natural, ganchos vivos, pausas breves en el reto, claridad al revelar. No suenes robótico.
```

Si no pones `VOICE_INSTRUCTIONS`, el proyecto usa un prompt por defecto en español (Shorts).

## 3. Generar el vídeo con esa voz

Con un trabajo ya existente (ej. `puntos`):

```bash
npm run short:voice -- --id puntos
```

Eso regenera narración + subtítulos + render + post-proceso.

Short nuevo desde cero:

```bash
npm run short -- "¿Puedes resolver el reto de los 9 puntos?"
```

(usará lo que haya en `.env`)

## 3b. Probar voces barato (antes del Short completo)

No hace falta renderizar el vídeo. Genera solo una frase (~2 s) por voz:

```bash
npm run short:preview-voices
# o solo algunas:
npm run short:preview-voices -- --voices coral,nova,sage
```

Escucha los WAV en `output/voice-samples/openai/`.  
Consume muy poco de la API (una frase corta × N voces), no un narración de 30 s.

También puedes oír demos en la web de OpenAI (Playground / docs de Audio), pero el preview del repo usa **tu** clave, modelo e instrucciones reales.

## 4. Elegir voz (`VOICE_NAME`)

| Nombre | Sensación típica |
| --- | --- |
| `cedar` | Voz autorizada en evidencia AV (`T-AV-QC-001`) |
| `coral` | Cálida, clara — **por defecto** |
| `nova` | Femenina, fresca |
| `sage` | Suave, calmada |
| `ash` | Neutra |
| `ballad` | Expresiva |
| `shimmer` | Brillante |
| `alloy` | Neutra clásica |
| `echo` / `onyx` / `fable` | Más marcadas |

Cambia solo la variable y vuelve a lanzar `short:voice`:

```bash
# temporal, sin editar .env
VOICE_NAME=nova npm run short:voice -- --id puntos
```

## 5. Modelos (`VOICE_TTS_MODEL`)

| Modelo | Uso |
| --- | --- |
| `gpt-4o-mini-tts` | **Recomendado** — barato + acepta `VOICE_INSTRUCTIONS` |
| `tts-1-hd` | Más “studio”, sin instrucciones de estilo |
| `tts-1` | Más barato/rápido, calidad media |

## 6. Comprobar que no usa macOS

En la consola debe salir algo como:

```text
[shorts] Voz: provider=openai-tts model=… name=coral
[shorts] Narración generada: gpt-4o-mini-tts/coral …
```

Y en `output/<id>/voice-meta.json`:

```json
"provider": "openai-tts",
"model": "gpt-4o-mini-tts/coral"
```

Si sigue poniendo `macos-say`, revisa que `.env` tenga `VOICE_PROVIDER=openai-tts` y reinicia la terminal / guarda el archivo.

## 7. Errores frecuentes

| Error | Qué hacer |
| --- | --- |
| `Falta OPENAI_API_KEY` | Añade la clave en `.env` |
| `HTTP 401` | Clave inválida o revocada |
| `HTTP 429` | Límite de uso / sin crédito en Billing |
| Misma voz de antes en el MP4 | Ya está corregido el caché; usa `short:voice` (no solo cambiar el wav a mano) |

## 8. Seguridad

- Nunca subas `.env` a Git (ya está en `.gitignore`)
- No pegues la clave en el chat ni en capturas
- Si se filtra: revócala en OpenAI y crea otra
