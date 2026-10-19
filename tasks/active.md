# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-STUDIO-001`
- **Fase ROADMAP:** `P7`

## Estado de aprobación

`accepted`

> Aceptado 2026-10-19 por humano (chat Cursor) tras comprobaciones finales.  
> P0–P6 `accepted`. P7 `accepted`. P8 `blocked`. Sin YouTube. Sin commit/push/merge en este acto.

## Objetivo

Studio / preview documentado y estable (tres vías + defaults + helper props).

## Alcance entregado

1. `docs/studio-preview.md` + enlaces README/usage/tooling/troubleshooting/ARCHITECTURE.
2. `shortVideoDefaultProps` ← plantilla logic-lateral (visual).
3. `short:studio-props` → `studio-props.json` desde job.
4. D015; tests `studio-preview.test.ts`.

## Criterios de aceptación

- [x] Doc Studio vs `short:preview` vs `video-preview.mp4`.
- [x] Default ShortVideo = logic-lateral parseable.
- [x] `short:studio-props` genera JSON válido.
- [x] HelloRemotion / ScriptVideo / beats A–D no alterados (solo default ShortVideo).
- [x] `npm test` + `typecheck` OK.
- [x] Sin deps; sin publish.
- [x] Humano marca `accepted` (2026-10-19, chat Cursor, sujeto a comprobaciones finales).

## Pruebas de aceptación (re-ejecutadas 2026-10-19)

```bash
npm test          # 21 files / 102 tests passed
npm run typecheck # OK
npm run short:studio-props -- --id s4-19-interruptores
# → output/s4-19-interruptores/studio-props.json (hasAudio/hasMusic true)
# Audio/música referencian public/shorts/s4-19-interruptores/
```

Default Studio verificado: familia `logic-lateral`, beat oficial, sin audio en defaults.

**Nota:** no se afirma render ni inspección audiovisual de aceptación.

## Limitaciones / pendientes

- Default Studio ≠ job con narración real.
- **Audio en Studio depende de archivos disponibles en `public/shorts/<id>/`.**
- Validación audiovisual real: **pendiente** (no bloquea el `accepted` de P7 código/docs).
- P8 / YouTube fuera de alcance (`blocked`).

## Notas

- Sin tarea de implementación siguiente autorizada. P8 permanece `blocked` hasta nueva decisión humana.
- Evidencias y firma de aceptación en `tasks/approvals.md`.
