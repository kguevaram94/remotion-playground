# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-MULTIFORMAT-001` · entrega **A** (contrato multiformato) — cerrada
- **Fase ROADMAP:** `P6` (sigue `proposed`)

## Estado de aprobación

`accepted`

> Entrega **A** aceptada por humano (chat Cursor 2026-10-19).  
> B, C, D permanecen `proposed`. P6 permanece `proposed`.  
> **Sin** implementación `in_progress`. No iniciar B hasta nuevo `approved`.

## Objetivo (A — cerrado)

Contrato TypeScript multiformato, registro/resolución de familias, campo `family` opcional retrocompatible, validación compartida vs específica, beat checker de reglas comunes, tests/regresión logic-lateral y docs.

## Alcance entregado y aceptado (A)

Implementado según `tasks/approvals.md` (contrato, registry, `family` opcional, beat común, validadores separados, docs D011).

## Limitaciones de aceptación (vinculantes)

- Regresión = **`--mode validate`** sobre `script-logic-lateral.json`. **No** se afirma render MP4 ni inspección audiovisual.
- Validación narrativa específica de **math / memory / illusion** queda pendiente (entregas B–D).
- `buildFromTitle` no registrado en `TEMPLATE_FAMILIES` (generación en `script-generator.ts`).
- P5 / QC no modificados; beat oficial logic-lateral intacto.

## Criterios de aceptación (entrega A)

- [x] Scripts logic-lateral sin `family` funcionan sin migración.
- [x] Scripts con `family` explícito se resuelven correctamente.
- [x] Familias desconocidas → error explícito.
- [x] Validadores compartidos y específicos separados.
- [x] Pipeline / P5 sin cambios de comportamiento de QC.
- [x] `npm test` (79 tests) y `npm run typecheck` OK.
- [x] Regresión validate de `script-logic-lateral.json` OK.
- [x] Diff acotado a A; sin deps; sin publish.
- [x] Humano marca `accepted` (2026-10-19).

## Notas de cierre

- Entrega A → `accepted`. Siguiente: B (math) en `proposed` hasta autorización humana explícita.
- Sin commit/push/merge/publicación en este cierre documental.
