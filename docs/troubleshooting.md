# Troubleshooting

## Falta API key

```
Falta AI_API_KEY u OPENAI_API_KEY
```

Usa `AI_PROVIDER=template` o define la clave en `.env` (nunca la subas a git).

## Acertijo bloqueado por validación

```
Acertijo no verificado automáticamente (partial|pending_review)
```

Opciones:

1. Corregir `script.json` / `answerKey`
2. `SHORTS_HUMAN_REVIEW_POLICY=warn_and_continue`
3. Revisar `output/<id>/validation.json`

## Trabajo bloqueado

```
está bloqueado por otra ejecución
```

Elimina `output/<id>/.lock` si el proceso murió.

## ffprobe no disponible

QC sigue funcionando con checks de archivos. Para resolución/fps/duración exactos:

```bash
brew install ffmpeg
```

## Remotion / Chrome headless

El render usa `@remotion/renderer`. En el primer render puede descargar Chromium. Necesitas red la primera vez.

## Audio de prueba

El banner amarillo y `report.json` marcan audio mock. No publiques ese MP4 como narración final. Cambia `VOICE_PROVIDER`.

## Reanudar tras fallo de render

```bash
npm run short:resume -- --id 9-puntos
```

No regenera guion/voz si esas fases están `done`.
