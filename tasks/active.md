# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-POLISH-001`
- **Fase ROADMAP:** `P5`

## Estado de aprobación

`review_required`

> Remediation loudnorm QC (auditoría) lista. Esperando revisión humana. **No** marcar `accepted` el agente.

## Objetivo

Cerrar hallazgos de auditoría de `T-POLISH-001` sobre loudnorm: el QC no debe aprobar un MP4 solo porque exista `narration-loudnorm.wav`; debe demostrarse (provenance) que el render publicó la narración normalizada.

## Alcance

- Provenance de audio en render (`render-narration.json` / `job.render.narrationProvenance`).
- QC basado en provenance (no existencia post-hoc del WAV).
- Eliminar generación de loudnorm en `post_process`.
- Tests unitarios/integración de selección + caso post-render.
- Docs (tooling, generar-short, DECISIONS enmienda D009).

## Fuera de alcance

Respetado: sin formatos nuevos, sin mix loudnorm integral, sin YouTube, sin TTS/pago, sin deps nuevas, sin commit/push/merge, sin marcar P5 `accepted`.

## Archivos afectados previstos

- `src/shorts/media/narration-loudnorm.ts`, `public-audio.ts`
- `src/shorts/pipeline/render-video.ts`, `post-process.ts`, `quality-check.ts`
- `src/shorts/storage/job-store.ts`
- `tests/unit/narration-loudnorm.test.ts`
- `docs/tooling.md`, `docs/generar-short.md`, `docs/DECISIONS.md`
- `tasks/active.md`, `tasks/approvals.md`

## Dependencias

- P0–P4: `accepted`
- Alcance P5 / remediación autorizada en chat Cursor 2026-10-19

## Criterios de aceptación

- [x] QC falla / unverified si loudnorm solo aparece post-render o falta provenance.
- [x] Render registra kind + sha1 del audio publicado.
- [x] `post_process` no crea `narration-loudnorm.wav`.
- [x] Mock sigue omitido y etiquetado.
- [x] Tests cubren post-render, selección y publicación=loudnorm.
- [ ] Revisión humana; **no** `accepted` automático.
- [ ] Evidencia audiovisual opcional (extracción audio del MP4) pendiente de OK humano.

## Pruebas que deben ejecutarse

```bash
npm test
npm run typecheck
```

Ejecutados (remediación): **60 tests OK**, typecheck OK.

## Riesgos y cuestiones pendientes

- Provenance demuestra publicación a Remotion, **no** re-extracción del audio del contenedor MP4.
- Sin render TTS de pago no hay evidencia auditiva de producción.
- Catálogo BGM sigue en 0 pistas (limitación previa).

## Notas de progreso

- Auditoría: voice → (loudnorm) → render (publish + provenance) → post (sin loudnorm) → QC (provenance).
- Entrega remediation en `review_required`.
