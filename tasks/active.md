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
> Ciclo: propuesta documental `proposed` → **contrato aprobado por humano** → implementación → **`review_required`** (este registro). **007C-R2 permanece abierta** hasta evidencia de ejecución real + sync.

## Objetivo

Implementar el contrato humano: la generación de `narration-loudnorm.wav` **no** deja el sample rate a FFmpeg implícito; fija **`-ar 24000`** (y PCM16 mono compatible con consumidores), conservando el filtro loudnorm de volumen P5.

## Alcance (sí)

1. Cambio mínimo en `loudnormAudio` / argv FFmpeg (`buildLoudnormFfmpegArgs`).
2. Tests unitarios de contrato (argumentos / constantes; **sin** afirmar sample rate medido en WAV stub).
3. Registro en `tasks/active.md` + `tasks/approvals.md` (decisión humana + entrega; R2 **abierta**).

## Fuera de alcance (no)

- Ejecutar FFmpeg sobre audio real, `npm run short`, Remotion, render, QC del piloto.
- Ejecutar `npm test` / typecheck / build (prohibido en esta autorización).
- Modificar `.env`, topics, narraciones fuente, artefactos generados.
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
| `tasks/approvals.md` | Decisión + entrega R2 |

## Dependencias

- `T-CHATTERBOX-007C-SYNC` `accepted` (con reservas); propuesta R2 documental previa.
- Decisión humana: contrato 24 kHz **aprobado** (chat Cursor, 2026-10-22).

## Criterios de aceptación

- [x] `loudnormAudio` fija explícitamente salida a 24 000 Hz (no depende del default FFmpeg).
- [x] Filtro de volumen loudnorm P5 conservado (`I=-16:TP=-1.5:LRA=11`).
- [x] WAV de salida solicitado como PCM16 mono (`pcm_s16le`, `-ac 1`).
- [x] Tests unitarios distinguen args/stub vs validación FFmpeg real.
- [ ] **Pendiente (requiere autorización):** ejecutar FFmpeg real + medir sr/duración/sync; re-piloto si aplica.
- [ ] **Pendiente:** humano acepta entrega → posible progreso hacia cierre R2 (R2 **no** se cierra solo por código/tests).

## Pruebas a ejecutar

**En esta fase: no ejecutadas** (autorización lo prohíbe). Cuando el humano autorice:

```bash
npx vitest run tests/unit/loudnorm-sample-rate-contract.test.ts tests/unit/narration-loudnorm.test.ts
npm run typecheck
# FFmpeg real / piloto (autorización aparte):
# ffprobe output/<job>/narration-loudnorm.wav  # sample_rate == 24000
# comparar duración vs narration.wav (tolerancia single-take 0,05 s si aplica)
```

## Riesgos y pendientes (reservas — sin cambio de cierre)

| ID | Estado | Nota |
| --- | --- | --- |
| **007C-R1** | **Abierta** | Sin cambio |
| **007C-R2** | **Abierta** | Contrato **aprobado** + código/tests unitarios entregados; **falta** evidencia FFmpeg/sync real |
| **007C-R3** | **Cerrada** | Sin cambio |
| **007C-R4** | **Abierta** | Sin cambio |
| **007C-R5** | **Abierta** | Sin cambio |
| P8 | `blocked` | Sin cambio |
| `T-CHATTERBOX-001` | `proposed` | Sin cambio |

## Notas

- Padre `T-CHATTERBOX-007C-SYNC` sigue `accepted` (con reservas). Esta tarea es la implementación del contrato R2, no un cierre de la reserva.
- Preexistente dirty local en `tasks/*` (propuesta R2 documental) absorbido/superseded por este registro de implementación.
- No se afirma éxito de tests/typecheck/FFmpeg en esta entrega.
