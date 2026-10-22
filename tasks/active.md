# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-007C-SYNC`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no inicia YouTube; no altera P0–P7 `accepted`)

## Estado de aprobación

`accepted` (opción A · single-take `VOICE_PROVIDER=file` · **con reservas 007C-R1…R5 abiertas**)

> **Aceptación humana 2026-10-22** (chat Cursor): opción A aceptada **con reservas**. El esquema oficial **no** define `accepted_with_reservations`; se registra **`accepted` + reservas vinculantes** (mismo patrón que `T-CHATTERBOX-002` fase 1 / 2A).
>
> Base de la aceptación: evidencia de implementación + tests offline + typecheck de la entrega técnica `30cf3d3`; auditoría solo lectura 2026-10-22 (**APTO CON RESERVAS**). **No** se re-ejecutaron suites en el acto de aceptación.
>
> Ciclo: `approved` → `in_progress` → `review_required` → **`accepted` (con reservas)**.
>
> | Campo | Valor |
> | --- | --- |
> | Rama | `main` |
> | Base | `dbd86d27084a1692267b25cbfcd60b16ea73dda4` |
> | Entrega técnica (opción A) | `30cf3d3414366ab2a79d55a5714c1da6ca50d952` (padre `dbd86d2`) |
> | HEAD documental vigente | `93054b9ab6eeb7440007386f1cbcd65bef682072` (padre `30cf3d3`) |
> | Sincronización remota | `main` = `origin/main` (0 ahead / 0 behind); dirty local solo en `tasks/*` **sin staging** |
> | Working tree | registro de aceptación documental **sin staging** |
> | Topic piloto | `data/topics/t007b-file-pilot.json` versionado en la entrega técnica |
> | WAV ref. | `/tmp/t007a-narration-concat.wav` (SHA-256 `13f80d920828554b506e543003adf98fa3a0d6b47162ee5fc369915d60a7a4c2`) |
> | Auditoría (2026-10-22) | **APTO CON RESERVAS** → **007C-R1…R5** abiertas abajo |
> | Gobernanza | esta `accepted` **≠** autorización de piloto / opción B / Remotion / loudnorm-QC reales / inferencia / publicación |
>
> **No** autorizado en este acto: opción B; piloto real; Remotion; FFmpeg/loudnorm/QC reales; inferencia; publicación; commit/push.

## Objetivo

Tratar `VOICE_PROVIDER=file` como un único take: duración total del probe WAV; conservar duraciones de escena del guion cuando coinciden con el WAV (tolerancia 0,05 s); permitir escenas mudas; eliminar `voice-meta.segments` con duraciones inventadas; no redistribuir a `SHORTS_TARGET_DURATION=25` en el caso coherente.

## Alcance (sí)

1. Meta single-take (`timingMode`, `cuesKind: uniform`) sin equal-split.
2. `planScenes` / `planning_scenes` / `generating_subtitles` con `voiceTimingMode: 'single-take'`.
3. Error explícito si `|Σ escenas − WAV| > 0,05 s`.
4. Invalidación mínima de caché `file` (`file:single-take-v1` — cambio de clave; no purge de artefactos).
5. Tests unitarios/offline + `typecheck`.
6. Docs mínimas en `docs/voice.md`.

## Fuera de alcance (no)

- Opción B / forced alignment / fronteras en el topic.
- Ejecutar pipeline real, Remotion, FFmpeg, loudnorm, QC, inferencia, red.
- Modificar `.env`, contenido del topic piloto, o el WAV T-006 de referencia.
- Alterar código funcional / pruebas de opción A en esta fase de registro de aceptación.
- Cambiar comportamiento medido de OpenAI TTS / Chatterbox multi-segmento (salvo no-regresión ya entregada).

## Archivos afectados

| Path | Rol |
| --- | --- |
| `src/shorts/voice/single-take.ts` | Contrato, tolerancia, meta, detección |
| `src/shorts/ai/scene-planner.ts` | Modo `single-take` |
| `src/shorts/pipeline/generate-voice.ts` | Meta file + caché token |
| `src/shorts/pipeline/generate-scenes.ts` | `voiceTimingMode` si provider=file |
| `src/shorts/pipeline/generate-subtitles.ts` | Ignora segmentos legacy file |
| `docs/voice.md` | Documentación del contrato |
| `data/topics/t007b-file-pilot.json` | Topic piloto |
| `tests/unit/*single-take*` / openai-multisegment / extensiones | Cobertura offline |

## Dependencias

- Diseño 007C-SYNC opción A (chat Cursor).
- WAV autorizado `/tmp/t007a-narration-concat.wav` (referencia; SHA-256 `13f80d920828554b506e543003adf98fa3a0d6b47162ee5fc369915d60a7a4c2`; no usado en tests unitarios).

## Criterios de aceptación

- [x] WAV/guion coherente → suma 9,6 s / 288 frames @ 30 fps; outro mudo válido (cubierto offline).
- [x] Sin segmentos file 4,8+4,8; sin redistribute a 25 en caso coherente.
- [x] Error si desajuste > tolerancia.
- [x] Meta antigua file / cues uniformes compatibles; OpenAI + Chatterbox sin regresión offline.
- [x] `typecheck` OK en la entrega; sin Remotion/FFmpeg/inferencia/publicación en el alcance de opción A.
- [x] Aceptación humana explícita de la entrega técnica opción A (`accepted` con reservas) — **2026-10-22**.
- [ ] Piloto real — **no** forma parte de esta aceptación; requiere `approved` independiente.

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
# → passed en la entrega de implementación (evidencia previa; esta aceptación no re-ejecuta)

npm run typecheck
# → OK en la entrega de implementación (evidencia previa; esta aceptación no re-ejecuta)
```

## Riesgos y pendientes (reservas abiertas — vinculantes)

| ID | Reserva / riesgo residual | Seguimiento |
| --- | --- | --- |
| **007C-R1** | Sin test unitario del borde exacto `Δ = 0,05 s` (código: `delta <= 0,05`) | Opcional: micro-test; no cerrado por esta aceptación |
| **007C-R2** | Duración / sync tras loudnorm **real** no auditada (mock en tests) | Requiere piloto file + FFmpeg real (`approved` aparte) |
| **007C-R3** | QC real y duración vídeo/audio no ejercitados | Requiere piloto + Remotion/QC (`approved` aparte) |
| **007C-R4** | Resume de job real con `voice-meta` antiguo no probado (compat offline parcial) | Prueba de resume real o doc operativa (`approved` aparte) |
| **007C-R5** | Caché `file:single-take-v1` = cambio de clave; **no** purge de artefactos | Operativo; purge manual solo si hace falta |
| — | Cues `uniform` ≠ alineación fonética | Opción B (`proposed`) |
| — | Piloto real `generar-short` | `proposed` hasta nuevo `approved` humano |

## Notas

- **Histórico (antes de `93054b9`):** borradores afirmaban «topic untracked» / «sin commit/push» de la entrega. Eso era el estado anterior a `93054b9`, no el de la entrega técnica `30cf3d3`.
- Reservas **007C-R1…R5** permanecen **abiertas**; la aceptación **no** las declara resueltas.
- Siguiente: autorización de piloto file **o** opción B — cada una `proposed` hasta nuevo `approved` humano. P8 permanece `blocked`. `T-CHATTERBOX-001` permanece `proposed`.
