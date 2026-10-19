# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-MULTIFORMAT-001` · entrega **B** (familia math) — cerrada
- **Fase ROADMAP:** `P6` (sigue `proposed`)

## Estado de aprobación

`accepted`

> Entrega **B** aceptada por humano (chat Cursor 2026-10-19).  
> A permanece `accepted`. C, D y P6 permanecen `proposed`.  
> **Sin** implementación `in_progress`. No iniciar C hasta nuevo `approved`.

## Objetivo (B — cerrado)

Familia **math** al nivel de plantilla oficial: JSON, beat propio, builder, validador (+ narrativa básica answerKey↔reveal), componente, tests y docs.

## Alcance entregado y aceptado (B)

Implementado según `tasks/approvals.md`: `script-math.json`, beat math, `validateMathNarrative`, `MathPuzzle`, tests/typecheck, regresión validate logic-lateral.

## Limitaciones de aceptación (vinculantes)

- Comprobaciones = **validación** (`--mode validate` / unit tests). **No** se afirma render MP4 ni inspección audiovisual.
- El fixture `script-math.json` y los tests cubren el camino feliz aritmético + coherencia answerKey↔reveal; **no** demuestran cobertura exhaustiva de casos límite matemáticos.
- Validación narrativa memory/illusion pendiente (C/D).
- Beat oficial logic-lateral y P5/QC intactos.

## Criterios de aceptación (entrega B)

- [x] Fixture `script-math.json` + beat math + validación answerKey↔reveal + `MathPuzzle`.
- [x] Tests y typecheck superados.
- [x] Regresión validate logic-lateral OK.
- [x] Humano marca `accepted` (2026-10-19).

## Pruebas ejecutadas (referencia de la entrega)

```bash
npm test          # 18 files / 86 tests passed
npm run typecheck # OK
npm run short -- --input data/templates/script-math.json --mode validate --id t-multiformat-b-math
# → auto_validated
npm run short -- --input data/templates/script-logic-lateral.json --mode validate --id t-multiformat-b-logic-regression
# → OK (partial)
```

## Notas de cierre

- Entrega B → `accepted`. Siguiente: C (memory) en `proposed` hasta autorización humana explícita.
- Sin commit/push/merge/publicación en este cierre documental.
