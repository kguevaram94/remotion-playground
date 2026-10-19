# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-STUDIO-001`
- **Fase ROADMAP:** `P7`

## Estado de aprobación

`review_required`

> Implementado 2026-10-19. Esperando revisión humana.  
> P8 `blocked`. Sin commit/push/merge. Sin YouTube.

## Objetivo

Studio / preview documentado y estable (tres vías + defaults + helper props).

## Alcance entregado

1. `docs/studio-preview.md` + enlaces README/usage/tooling/troubleshooting/ARCHITECTURE.
2. `shortVideoDefaultProps` ← plantilla logic-lateral (visual).
3. `short:studio-props` → `studio-props.json` desde job.
4. D015; tests `studio-preview.test.ts`.
5. `npm test` 102 · `typecheck` OK · helper verificado con `s4-19-interruptores`.

## Criterios de aceptación

- [x] Doc Studio vs `short:preview` vs `video-preview.mp4`.
- [x] Default ShortVideo = logic-lateral parseable.
- [x] `short:studio-props` genera JSON válido.
- [x] HelloRemotion / ScriptVideo / beats A–D no alterados (solo default ShortVideo).
- [x] `npm test` + `typecheck` OK.
- [x] Sin deps; sin publish.
- [ ] Humano marca `accepted` (o rechaza).

## Pruebas ejecutadas

```bash
npm test          # 21 files / 102 tests passed
npm run typecheck # OK
npm run short:studio-props -- --id s4-19-interruptores
# → output/s4-19-interruptores/studio-props.json (hasAudio/hasMusic true)
```

**Nota:** no se afirma render/AV de aceptación; Studio default = visual sin voz.

## Limitaciones

- Default Studio ≠ job con narración real.
- Audio en Studio solo si existe bajo `public/shorts/<id>/`.
- P8 / YouTube fuera de alcance.

## Notas

- Informe en `tasks/approvals.md`. Esperando humano antes de marcar P7 `accepted`.
