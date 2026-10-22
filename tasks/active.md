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
> Ciclo: `approved` (chat) → `in_progress` → **`review_required`** (sin `accepted` humano aún).
> HEAD de partida (base de implementación): `dbd86d27084a1692267b25cbfcd60b16ea73dda4`.
> HEAD de entrega versionada (observado): `30cf3d3414366ab2a79d55a5714c1da6ca50d952` (padre `dbd86d2`); rama `main` = `origin/main`.
> Topic piloto `data/topics/t007b-file-pilot.json`: **versionado** en esa entrega (ya no untracked).
> Auditoría solo lectura (2026-10-22): veredicto técnico **APTO CON RESERVAS**; fase correctiva de gobernanza documental en curso (este archivo).
> **No** autorizado / **no** hecho: opción B; piloto real (`npm run short` / `generar-short`); Remotion; FFmpeg real; loudnorm real; QC real; inferencia; publicación.
> **No** interpretar commit/push de la entrega como aceptación humana ni como autorización del piloto.

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
- Alterar código funcional / pruebas de opción A en esta fase correctiva documental.
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
| `data/topics/t007b-file-pilot.json` | Topic piloto (versionado en entrega `30cf3d3`) |
| `tests/unit/*single-take*` / openai-multisegment / extensiones | Cobertura offline |
| `tasks/active.md`, `tasks/approvals.md` | Gobernanza (esta corrección documental) |

## Dependencias

- Diseño 007C-SYNC opción A (chat Cursor).
- Topic piloto versionado `data/topics/t007b-file-pilot.json` (en HEAD `30cf3d3`).
- WAV autorizado `/tmp/t007a-narration-concat.wav` (referencia; SHA-256 `13f80d920828554b506e543003adf98fa3a0d6b47162ee5fc369915d60a7a4c2`; no usado en tests unitarios).

## Criterios de aceptación

- [x] WAV/guion coherente → suma 9,6 s / 288 frames @ 30 fps; outro mudo válido (cubierto offline).
- [x] Sin segmentos file 4,8+4,8; sin redistribute a 25 en caso coherente.
- [x] Error si desajuste > tolerancia.
- [x] Meta antigua file / cues uniformes compatibles; OpenAI + Chatterbox sin regresión offline.
- [x] `typecheck` OK en la entrega; sin Remotion/FFmpeg/inferencia/publicación en el alcance de opción A.
- [ ] Aceptación humana explícita de la entrega técnica (`accepted`) — **pendiente**.
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
# → passed en la entrega de implementación (ver informe previo; esta fase correctiva no re-ejecuta)

npm run typecheck
# → OK en la entrega de implementación (esta fase correctiva no re-ejecuta)
```

## Riesgos y pendientes (reservas abiertas)

| ID | Reserva / prueba pendiente | Notas |
| --- | --- | --- |
| **007C-R1** | Test del límite exacto `Δ = 0,05 s` | Código usa `delta <= 0,05`; falta caso unitario en el borde exacto |
| **007C-R2** | Duración / sync tras loudnorm **real** | No auditado con FFmpeg real en esta tarea; mock en tests |
| **007C-R3** | QC real y duración vídeo/audio | Pipeline/Remotion/QC no ejecutados en el alcance opción A |
| **007C-R4** | Reanudación con `voice-meta` antiguo en disco | Compatibilidad parcial cubierta offline; resume de job real pendiente |
| **007C-R5** | Caché `file:single-take-v1` | Cambia la **clave** de identidad; **no** purga artefactos/jobs existentes |
| — | Cues `uniform` ≠ alineación fonética | Opción B pendiente (`proposed`) |
| — | Piloto real `generar-short` | `proposed` hasta nuevo `approved` humano |

## Notas

- Corrección documental 2026-10-22: se elimina la afirmación obsoleta de «topic untracked» / «sin commit/push de la entrega». El estado Git real es entrega en `30cf3d3` en `main`/`origin/main`.
- Esta fase correctiva deja cambios **solo** en `tasks/*`, sin staging ni commit, a la espera de revisión humana.
- Siguiente fase sugerida: aceptación técnica de opción A **o** autorización de piloto file **o** opción B — cada una en `proposed` hasta nuevo `approved` / `accepted` humano.
