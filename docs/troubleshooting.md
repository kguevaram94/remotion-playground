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

El banner amarillo y `report.json` marcan audio mock. `publishEligibility.eligible` será `false` (`audio_mock` / `mock_omitted`). No publiques ese MP4 como narración final. Cambia `VOICE_PROVIDER`.

## QC bloqueado por loudnorm (voz real)

```
Narración loudnorm no verificada…
# o: Narración loudnorm ausente o no seleccionada en el render
```

Con voz no-mock el gate es **blocking** (`report.ok=false`, fase `quality_check` failed). No basta con que exista `video.mp4` o un WAV loudnorm post-hoc.

1. Comprueba `output/<id>/render-narration.json` (`kind` debe ser `loudnorm`).
2. Regenera voz + render: `npm run short -- --id <id> --mode voice`
3. O, si el render ya tiene provenance buena: `npm run short:post -- --id <id>`

Jobs antiguos `completed` sin provenance **no** se migran solos; hay que revalidar con los comandos de arriba.

## Reanudar tras fallo de render

```bash
npm run short:resume -- --id 9-puntos
```

No regenera guion/voz si esas fases están `done`. Si `quality_check` ya está `done` con un informe antiguo, usa `short:post` o `--mode voice` para forzar re-QC.
