# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-007C-R2`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (reserva vinculante de `T-CHATTERBOX-007C-SYNC`; **no** es P8; no altera P0–P7 `accepted`)

## Estado de aprobación

`accepted`

> **Cierre humano 2026-10-22** (chat Cursor): cierre formal de la reserva **007C-R2** por cumplimiento del contrato técnico aprobado, con base en la validación aislada FFmpeg/ffprobe y el re-piloto integrado documentados. Autoriza **solo** actualización documental y estado de R2. **No** autoriza código, ejecución de procesos ni operaciones Git.
>
> Ciclo: propuesta → contrato aprobado → implementación → evidencia aislada → re-piloto integrado (`--mode voice`, exit 0) → **`accepted`** / **R2 cerrada**.

## Objetivo

Implementar el contrato humano: la generación de `narration-loudnorm.wav` **no** deja el sample rate a FFmpeg implícito; fija **`-ar 24000`** (y PCM16 mono compatible con consumidores), conservando el filtro loudnorm de volumen P5. **Cumplido** (código + validación aislada + re-piloto integrado).

## Alcance (sí) — histórico de la tarea

1. Cambio mínimo en `loudnormAudio` / argv FFmpeg (`buildLoudnormFfmpegArgs`).
2. Tests unitarios de contrato (argumentos / constantes).
3. Registro en `tasks/active.md` + `tasks/approvals.md` (decisión humana + evidencias + **cierre R2**).

## Fuera de alcance (no) — intacto tras el cierre

- Contrato normativo de frecuencia de muestreo / canales **AAC** (medido, no contratado).
- Revisión audiovisual humana del audio regenerado.
- Cerrar R4, R5; reabrir R3; habilitar P8; avanzar `T-CHATTERBOX-001`.
- Publicación; interpretar `publishEligibility.eligible: true` como autorización de publicación.
- Commit / push / merge en este acto documental.
- (Histórico del cierre R2:) cerrar R1 quedó fuera de aquel acto; **R1 cerrada después** por acto documental aparte — ver notas / `tasks/approvals.md`.)

## Archivos afectados (implementación histórica)

| Path | Rol |
| --- | --- |
| `src/shorts/media/ffmpeg.ts` | `-ar 24000` + PCM16 mono en loudnorm |
| `tests/unit/loudnorm-sample-rate-contract.test.ts` | Contrato unitario (args) |
| `tests/unit/narration-loudnorm.test.ts` | Nota: path FFmpeg real vs unitario |
| `tasks/active.md` | Esta tarea |
| `tasks/approvals.md` | Decisión + evidencias + cierre R2 |

## Dependencias

- `T-CHATTERBOX-007C-SYNC` `accepted` (con reservas restantes **R4/R5**; **R1/R2/R3** cerradas).
- Contrato 24 kHz **aprobado** (chat Cursor, 2026-10-22).
- Validación aislada + re-piloto integrado (informes previos, 2026-10-22).
- Cierre humano **007C-R1** (2026-10-22): micro-tests del límite de tolerancia en `tests/unit/single-take.test.ts`.

## Criterios de aceptación

- [x] `loudnormAudio` fija explícitamente salida a 24 000 Hz (no depende del default FFmpeg).
- [x] Filtro de volumen loudnorm P5 conservado (`I=-16:TP=-1.5:LRA=11`).
- [x] WAV de salida solicitado como PCM16 mono (`pcm_s16le`, `-ac 1`).
- [x] Tests unitarios distinguen args/stub vs validación FFmpeg real.
- [x] **Evidencia aislada FFmpeg/ffprobe:** contrato validado (exit 0; 24 000 Hz mono `pcm_s16le`; Δ duración 0,000 s ≤ 0,05 s).
- [x] **Re-piloto integrado:** una sola ejecución `--mode voice`, exit 0; WAV integrado 24 000 Hz mono PCM16 9,600 s; Δ 0,000 s; MP4 H.264 + AAC LC 48 000 Hz estéreo; duraciones 9,600 s; QC `ok: true` / `blocking: []`; hash loudnorm = evidencia aislada ≠ pre-fix.
- [x] **Cierre humano de R2** (2026-10-22).

## Pruebas a ejecutar

**En este acto documental:** no se ejecutan FFmpeg, ffprobe, tests, typecheck, pipeline, Remotion, render ni QC (solo registro de cierre).

Evidencia ya registrada (validación aislada):

```text
Entrada:  /tmp/t007c-r2-loudnorm-validate-79582/input-narration.wav
          SHA-256 13f80d920828554b506e543003adf98fa3a0d6b47162ee5fc369915d60a7a4c2
Salida:   /tmp/t007c-r2-loudnorm-validate-79582/narration-loudnorm.wav
          SHA-256 0925227e6ef274b9cd716403689abd6840549e053ec06460bfb1148bf031cbda
```

Evidencia ya registrada (re-piloto integrado — ver `tasks/approvals.md`):

```text
Job:     output/t007b-file-pilot/
Loudnorm SHA-256 0925227e6ef274b9cd716403689abd6840549e053ec06460bfb1148bf031cbda
          (= validación aislada; ≠ pre-fix fe96c842739f7b61223418894b690d60dda52caf31e57be7b0d0621e6184de65)
MP4:     SHA-256 887c945ee047a039dfa4b6a743cba2c4d64e1f35037ba7d19523860a5e4fef71
Report:  SHA-256 9f09293fd72e1dd0997240204dcf94c54c7cdebb340c6fcda4bce696e099be8f
```

## Riesgos y pendientes (reservas)

| ID | Estado | Nota |
| --- | --- | --- |
| **007C-R1** | **Cerrada** | Micro-tests límite inclusivo `Δ = 0,05 s` + superior; cierre humano 2026-10-22 · `tests/unit/single-take.test.ts` |
| **007C-R2** | **Cerrada** | Contrato WAV 24 kHz validado aislado + integrado; cierre humano 2026-10-22 |
| **007C-R3** | **Cerrada** | Sin cambio |
| **007C-R4** | **Abierta** | Sin cambio |
| **007C-R5** | **Abierta** | Sin cambio |
| P8 | `blocked` | Sin cambio |
| `T-CHATTERBOX-001` | `proposed` | Sin cambio |

## Notas

- Padre `T-CHATTERBOX-007C-SYNC` sigue `accepted` (con reservas **R4/R5** abiertas; **R1/R2/R3** cerradas).
- **Cierre humano 007C-R1 (2026-10-22, chat Cursor):** evidencia del micro-test aprobada; R1 → **`accepted` / cerrada**. Casos: (1) `Δ` bit-idéntica a `SINGLE_TAKE_DURATION_TOLERANCE_SEC` (ambos órdenes) acepta; (2) `Δ = T + 0,001 s` rechaza. Suite: `npm test -- tests/unit/single-take.test.ts` → 7 passed / exit 0. **Limitación:** contrato unitario únicamente; **no** afirma re-ejecución del pipeline completo. Ref. `tests/unit/single-take.test.ts`.
- Fuera del cierre R2: contrato AAC (rate/canales), revisión AV humana del audio, publicación.
- `publishEligibility.eligible: true` en QC **≠** autorización de publicación ni aprobación editorial del audio.
- En este acto documental (cierre R1) no se re-ejecutaron tests/pipeline ni operaciones Git (staging/commit/push).
