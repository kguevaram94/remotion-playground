# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-002` · sub-alcance **inferencia real / job con pesos**
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no altera P0–P7 `accepted`)

## Estado de aprobación

`proposed`

> **Borrador 2026-10-22** (agente, chat Cursor): solicitud de aprobación para inferencia real con pesos. **No** `approved`. **No** GO. **No** ejecutar. Detalle completo en `tasks/approvals.md` (sección propuesta bajo `T-CHATTERBOX-002`).
>
> Esperando decisión humana sobre modo A/B/C y clarificaciones marcadas `NEEDS_CLARIFICATION`.

## Objetivo

Obtener `approved` humano (si procede) para **una** ejecución aislada de inferencia Chatterbox con pesos locales ya presentes, sin cerrar reservas previas, sin publicación y sin desbloquear P8.

## Alcance (sí) — propuesto (pendiente de humano)

1. Ejecución aislada con pesos **ya** en disco (sin install/download en el acto), según modo que elija el humano:
   - **A** CLI `tools/chatterbox/synthesize.py`, o
   - **B** pipeline voz (`VOICE_PROVIDER=chatterbox` + job id nuevo), o
   - **C** short completo (más amplio; casi seguro límites extra).
2. Recoger evidencia de corrida (exit, device, tiempos, meta) y registrar límites.
3. Actualizar gobernanza tras ejecución **solo** si hubo `approved` previo.

## Fuera de alcance (no)

- Marcar esta propuesta como `approved` / GO sin humano.
- Cerrar reservas I-R*/M-R*, reserva 2A, limitaciones 2B, `conds.pt`, Perth.
- Publicación; desbloqueo de **P8**.
- Modificar `.env` sin autorización específica.
- Instalar deps / descargar pesos / daemon.
- Sobrescribir jobs/artefactos/cachés de evidencia existentes.
- Ampliar a otras fases no listadas.
- Reabrir o alterar `T-CHATTERBOX-001` `accepted` (alcance limitado).

## Archivos afectados previstos

| Path | Rol |
| --- | --- |
| `tasks/approvals.md` | Borrador de solicitud (ya redactado; `proposed`) |
| `tasks/active.md` | Esta entrada (`proposed`) |
| Artefactos de salida | **Solo tras `approved`** — paths/`--id` = `NEEDS_CLARIFICATION` |
| `.env` | **No tocar** salvo autorización humana específica |

## Dependencias

- `T-CHATTERBOX-001` `accepted` (alcance limitado) — no autoriza esta inferencia.
- `T-CHATTERBOX-002` fases 1 / 2A / 2B / 2C (H1–H4) aceptadas acotadas; inferencia excluida de 2C.
- Smoke CLI MPS 2026-10-21 (evidencia; ≠ job pipeline; ≠ cierre de reservas).
- Decisión humana sobre puntos `NEEDS_CLARIFICATION` (modo, rutas, job id, device, texto, post-pasos, `--force`, `.env`).

## Criterios de aceptación (para un futuro cierre — no aplican aún)

- [ ] Humano elige modo A/B/C (o variante escrita) y fija clarificaciones.
- [ ] Estado pasa a `approved` por humano (o autorización expresa equivalente).
- [ ] Ejecución aislada exitosa según criterios del borrador en `approvals.md`.
- [ ] Reservas/limitaciones previas documentadas como **aún abiertas**.
- [ ] Sin publicación; P8 `blocked`.

## Pruebas a ejecutar

**En este acto (`proposed`):** ninguna. No inferencia, no preflight operativo, no pipeline, no tests, no install, no download.

Tras un futuro `approved`, las pruebas/validaciones serán **solo** las que el humano autorice en ese acto (ver tabla en `approvals.md`).

## Riesgos y pendientes

| ID | Estado | Nota |
| --- | --- | --- |
| Modo A/B/C | `NEEDS_CLARIFICATION` | Sin comando canónico hasta elección humana |
| Rutas venv/ckpt/ref | `NEEDS_CLARIFICATION` | No leer/editar `.env` aquí |
| Job id / aislamiento | `NEEDS_CLARIFICATION` | Debe ser id nuevo |
| I-R1–I-R4, M-R1–M-R5 | Abiertas | Siguen tras éxito |
| Reserva 2A / limitaciones 2B | Abiertas | Siguen tras éxito |
| `conds.pt` / Perth | Pendientes | Siguen tras éxito |
| P8 | `blocked` | Sin cambio |

## Notas

- Detalle normativo de la propuesta: `tasks/approvals.md` → `T-CHATTERBOX-002` → «Propuesta de aprobación — inferencia real / job con pesos».
- **No ejecutar la propuesta** hasta decisión humana.
- Cambios locales preexistentes (p. ej. test 007C-R5) se preservan; este acto solo toca gobernanza documental.
