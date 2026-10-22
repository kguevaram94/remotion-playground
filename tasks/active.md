# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-007C-R2`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (reserva vinculante de `T-CHATTERBOX-007C-SYNC`; **no** es P8; no altera P0–P7 `accepted`)

## Estado de aprobación

`review_required`

> **Autorización humana 2026-10-22** (chat Cursor): implementar el contrato de audio aprobado — `narration-loudnorm.wav` debe fijar explícitamente la frecuencia de salida a **24 000 Hz** (piloto / Chatterbox). Autoriza código + tests + docs de gobernanza; **no** autoriza ejecutar FFmpeg real, pipeline, Remotion, QC, `npm test` / typecheck / build, ni commit/push.
>
> Ciclo: propuesta documental `proposed` → **contrato aprobado por humano** → implementación → evidencia FFmpeg/ffprobe aislada registrada → **`review_required`** (este registro). **007C-R2 permanece abierta**; cierre pendiente de **aprobación humana**.

## Objetivo

Implementar el contrato humano: la generación de `narration-loudnorm.wav` **no** deja el sample rate a FFmpeg implícito; fija **`-ar 24000`** (y PCM16 mono compatible con consumidores), conservando el filtro loudnorm de volumen P5.

## Alcance (sí)

1. Cambio mínimo en `loudnormAudio` / argv FFmpeg (`buildLoudnormFfmpegArgs`).
2. Tests unitarios de contrato (argumentos / constantes; **sin** afirmar sample rate medido en WAV stub).
3. Registro en `tasks/active.md` + `tasks/approvals.md` (decisión humana + entrega + evidencia aislada FFmpeg/ffprobe; R2 **abierta**).

## Fuera de alcance (no)

- Pipeline integrado, Remotion, render, QC, re-piloto o publicación.
- Ejecutar `npm test` / typecheck / build en este acto documental.
- Modificar `.env`, topics, narraciones fuente, artefactos generados del job.
- Cerrar R1, R2, R4, R5; reabrir R3; habilitar P8; avanzar `T-CHATTERBOX-001`.
- Opción B / forced alignment; providers / cues / escenas / publish salvo lo estrictamente necesario al loudnorm.
- Commit / push / merge.

## Archivos afectados

| Path | Rol |
| --- | --- |
| `src/shorts/media/ffmpeg.ts` | `-ar 24000` + PCM16 mono en loudnorm |
| `tests/unit/loudnorm-sample-rate-contract.test.ts` | Contrato unitario (args) |
| `tests/unit/narration-loudnorm.test.ts` | Nota: path FFmpeg real vs unitario |
| `tasks/active.md` | Esta tarea |
| `tasks/approvals.md` | Decisión + entrega + evidencia aislada R2 |

## Dependencias

- `T-CHATTERBOX-007C-SYNC` `accepted` (con reservas); propuesta R2 documental previa.
- Decisión humana: contrato 24 kHz **aprobado** (chat Cursor, 2026-10-22).

## Criterios de aceptación

- [x] `loudnormAudio` fija explícitamente salida a 24 000 Hz (no depende del default FFmpeg).
- [x] Filtro de volumen loudnorm P5 conservado (`I=-16:TP=-1.5:LRA=11`).
- [x] WAV de salida solicitado como PCM16 mono (`pcm_s16le`, `-ac 1`).
- [x] Tests unitarios distinguen args/stub vs validación FFmpeg real.
- [x] **Evidencia aislada FFmpeg/ffprobe:** contrato de normalización validado sobre copia independiente (exit 0; 24 000 Hz mono `pcm_s16le`; Δ duración 0,000 s ≤ 0,05 s). Ver `tasks/approvals.md`.
- [ ] **Pendiente:** resultado del pipeline integrado (job completo / Remotion / MP4).
- [ ] **Pendiente:** humano decide aceptación / **cierre** de R2 (R2 **no** se cierra solo por código ni por esta evidencia aislada).

## Pruebas a ejecutar

**En este acto documental:** no se re-ejecutan FFmpeg, ffprobe, tests, typecheck ni pipeline (solo registro de evidencia ya obtenida).

Evidencia ya registrada (validación aislada, no job completo):

```text
Entrada:  /tmp/t007c-r2-loudnorm-validate-79582/input-narration.wav
          SHA-256 13f80d920828554b506e543003adf98fa3a0d6b47162ee5fc369915d60a7a4c2
Salida:   /tmp/t007c-r2-loudnorm-validate-79582/narration-loudnorm.wav
          SHA-256 0925227e6ef274b9cd716403689abd6840549e053ec06460bfb1148bf031cbda
```

Cuando el humano autorice pipeline integrado / re-piloto:

```bash
# ffprobe output/<job>/narration-loudnorm.wav  # sample_rate == 24000
# comparar duración vs narration.wav (tolerancia single-take 0,05 s si aplica)
# opcional: medir AAC en video.mp4
```

## Riesgos y pendientes (reservas — sin cambio de cierre)

| ID | Estado | Nota |
| --- | --- | --- |
| **007C-R1** | **Abierta** | Sin cambio |
| **007C-R2** | **Abierta** | Contrato **aprobado** + código/tests + **validación aislada FFmpeg/ffprobe satisfactoria**; **no** pipeline integrado; cierre **pendiente de humano** |
| **007C-R3** | **Cerrada** | Sin cambio |
| **007C-R4** | **Abierta** | Sin cambio |
| **007C-R5** | **Abierta** | Sin cambio |
| P8 | `blocked` | Sin cambio |
| `T-CHATTERBOX-001` | `proposed` | Sin cambio |

## Notas

- Padre `T-CHATTERBOX-007C-SYNC` sigue `accepted` (con reservas). Esta tarea es la implementación del contrato R2, no un cierre de la reserva.
- La validación real usó una **copia independiente** de la narración (`/tmp/t007c-r2-loudnorm-validate-79582/`), **no** el WAV del job completo. Demuestra el contrato aislado con los args implementados; **no** el resultado del pipeline integrado.
- La salida WAV del piloto anterior sigue siendo artefacto **pre-fix**. Formato/frecuencia AAC del MP4 **sin medir**.
- En este acto documental no se ejecutaron FFmpeg, ffprobe, tests, typecheck ni pipeline.
