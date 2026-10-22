# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-007C-SYNC`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no inicia YouTube; no altera P0–P7 `accepted`)

## Estado de aprobación

`review_required` (opción A · single-take `VOICE_PROVIDER=file`)

> Autorización humana 2026-10-22 (chat Cursor): implementar **opción A** del diseño aprobado (sin pipeline de producción ni Remotion).  
> Ciclo: `approved` (chat) → `in_progress` → **`review_required`**.  
> HEAD de partida: `dbd86d27084a1692267b25cbfcd60b16ea73dda4`.  
> **No** autorizado / **no** hecho: opción B (fronteras verificadas); `npm run short` / `generar-short`; Remotion; FFmpeg real; loudnorm; QC; inferencia; publicación; commit/push.

## Objetivo

Tratar `VOICE_PROVIDER=file` como un único take: duración total del probe WAV; conservar duraciones de escena del guion cuando coinciden con el WAV (tolerancia 0,05 s); permitir escenas mudas; eliminar `voice-meta.segments` con duraciones inventadas; no redistribuir a `SHORTS_TARGET_DURATION=25` en el caso coherente.

## Alcance (sí)

1. Meta single-take (`timingMode`, `cuesKind: uniform`) sin equal-split.
2. `planScenes` / `planning_scenes` / `generating_subtitles` con `voiceTimingMode: 'single-take'`.
3. Error explícito si `|Σ escenas − WAV| > 0,05 s`.
4. Invalidación mínima de caché `file` (`file:single-take-v1`).
5. Tests unitarios/offline + `typecheck`.
6. Docs mínimas en `docs/voice.md`.

## Fuera de alcance (no)

- Opción B / forced alignment / fronteras en el topic.
- Ejecutar pipeline real, Remotion, FFmpeg, loudnorm, QC, inferencia, red.
- Modificar `.env`, topic piloto, WAV T-006.
- Commit / push / merge / staging del topic.
- Cambiar comportamiento medido de OpenAI TTS / Chatterbox multi-segmento (salvo no-regresión).

## Archivos afectados

| Path | Rol |
| --- | --- |
| `src/shorts/voice/single-take.ts` | Contrato, tolerancia, meta, detección |
| `src/shorts/ai/scene-planner.ts` | Modo `single-take` |
| `src/shorts/pipeline/generate-voice.ts` | Meta file + caché token |
| `src/shorts/pipeline/generate-scenes.ts` | `voiceTimingMode` si provider=file |
| `src/shorts/pipeline/generate-subtitles.ts` | Ignora segmentos legacy file |
| `docs/voice.md` | Documentación del contrato |
| `tests/unit/*single-take*` / openai-multisegment / extensiones | Cobertura offline |

## Dependencias

- Diseño 007C-SYNC opción A (chat Cursor).
- Topic piloto untracked `data/topics/t007b-file-pilot.json` (intact).
- WAV autorizado `/tmp/t007a-narration-concat.wav` (referencia; no usado en tests).

## Criterios de aceptación

- [x] WAV/guion coherente → suma 9,6 s / 288 frames @ 30 fps; outro mudo válido.
- [x] Sin segmentos file 4,8+4,8; sin redistribute a 25 en caso coherente.
- [x] Error si desajuste > tolerancia.
- [x] Meta antigua file / cues uniformes compatibles; OpenAI + Chatterbox sin regresión offline.
- [x] `typecheck` OK; sin Remotion/FFmpeg/inferencia/publicación en esta entrega.

## Pruebas a ejecutar

```bash
npx vitest run \
  tests/unit/single-take.test.ts \
  tests/unit/scene-planner-single-take.test.ts \
  tests/unit/narration-segments.test.ts \
  tests/unit/timing.test.ts \
  tests/unit/generate-voice-file-single-take.test.ts \
  tests/unit/generate-voice-openai-multisegment.test.ts \
  tests/unit/generate-subtitles-file-single-take.test.ts \
  tests/unit/generate-voice-chatterbox-cache.test.ts \
  tests/unit/file-provider.test.ts \
  tests/integration/chatterbox-voice-qc-offline.test.ts
# → passed (ver informe)

npm run typecheck
# → OK
```

## Riesgos y pendientes

- Cues `uniform` ≠ alineación fonética (opción B pendiente).
- Jobs antiguos con equal-split: se ignoran en subtítulos si `provider=file`; caché file invalidada con token v1 (no se borran jobs).
- Loudnorm real / duración post-loudnorm no auditados en esta tarea.
- Piloto real (`generar-short`) requiere autorización independiente.

## Notas

- Topic `data/topics/t007b-file-pilot.json` permanece untracked e intacto.
- Siguiente fase sugerida: ejecución piloto file **o** opción B — ambas en `proposed` hasta nuevo `approved`.
