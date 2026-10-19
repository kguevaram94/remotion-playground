# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-POLISH-001`
- **Fase ROADMAP:** `P5`

## Estado de aprobación

`accepted`

> Aceptado por humano en chat Cursor 2026-10-19 con limitación audiovisual documentada.  
> Base: auditoría de código, tests y typecheck. **No** se afirma validación de MP4 real con voz no-mock ni inspección auditiva.  
> **Sin** tarea de implementación `in_progress`. Siguiente fase/tarea: `proposed` (p. ej. P6) hasta nuevo `approved`.  
> Relacionado: `T-QC-LOUDNORM-001` ya `accepted` (2026-10-19).

## Objetivo

Elevar la calidad de producción del short logic-lateral de referencia: SFX procedural, BGM curada, thumbnail Satori, loudnorm de narración en el MP4 — sin cambiar el beat oficial.

## Alcance (cerrado)

Implementado y aceptado según `tasks/approvals.md` (gates SFX=A, BGM=B, thumb=A, loudnorm=B) + remediación provenance + gate `T-QC-LOUDNORM-001`.

## Limitaciones de aceptación (vinculantes)

- Aceptación por auditoría de código / tests / typecheck.
- **No** se afirma render MP4 real con voz no-mock ni revisión auditiva del resultado.
- Catálogo BGM: 0 pistas licenciadas (política + código OK; warning esperado).

## Criterios de aceptación

- [x] Alcance P5 entregado y revisado (código + tests + typecheck).
- [x] Remediación loudnorm provenance incluida.
- [x] Gate QC loudnorm (`T-QC-LOUDNORM-001`) `accepted`.
- [x] Limitación audiovisual documentada en `tasks/approvals.md`.
- [x] Humano marca `accepted` (2026-10-19).

## Notas de cierre

- P5 / `T-POLISH-001` → `accepted`.
- Siguiente trabajo (P6 u otro): queda en `proposed` hasta autorización humana explícita.
- Sin commit/push/merge/publicación en este cierre documental.
