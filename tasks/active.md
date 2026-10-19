# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-MULTIFORMAT-001` · entrega **D** (familia illusion)
- **Fase ROADMAP:** `P6` (sigue `proposed`; A+B+C `accepted`; D `review_required`)

## Estado de aprobación

`review_required`

> Entrega D implementada (2026-10-19). Esperando revisión humana.  
> P6 permanece `proposed`. Sin commit/push/merge. Sin cerrar P6 automáticamente.

## Objetivo

Familia **illusion** al nivel de plantilla oficial: JSON, beat propio, builder, validador (`partial`/`pending_review` + compareMode/showGuides), componente, tests y docs.

## Alcance entregado (D)

1. `data/templates/script-illusion.json` + README.
2. Beat `hook→puzzle→countdown→explanation→reveal→outro` en registry.
3. Builder + `family: 'illusion'` + CTA comentar.
4. `validateOpticalIllusion` + `validateIllusionNarrative` (nunca `auto_validated`; reveal exige compareMode+showGuides).
5. Pulido `OpticalIllusion.tsx`.
6. Tests + validate illusion/memory/math/logic-lateral.
7. Docs D014.

## Criterios de aceptación

- [x] `script-illusion.json` valida → `partial`.
- [x] Guías `compareMode` / `showGuides` en reveal.
- [x] Beat illusion propio; logic-lateral / math / memory intactos.
- [x] Regresión validate memory/math/logic-lateral OK.
- [x] `npm test` 99 · `typecheck` OK.
- [x] Sin deps; sin publish.
- [ ] Humano marca `accepted` (o rechaza) para D.

## Pruebas ejecutadas

```bash
npm test          # 20 files / 99 tests passed
npm run typecheck # OK
npm run short -- --input data/templates/script-illusion.json --mode validate --id t-multiformat-d-illusion
# → partial
npm run short -- --input data/templates/script-memory.json --mode validate --id t-multiformat-d-memory-regression
npm run short -- --input data/templates/script-math.json --mode validate --id t-multiformat-d-math-regression
npm run short -- --input data/templates/script-logic-lateral.json --mode validate --id t-multiformat-d-logic-regression
```

**Nota vinculante:** regresiones = `--mode validate` únicamente; **no** render ni inspección audiovisual.

## Limitaciones

- Validate only (no render/AV).
- Percepción subjetiva → siempre `partial`/`pending_review`.
- Fixture ≠ cobertura exhaustiva.
- Cierre P6 no automático al aceptar D.

## Notas

- Informe en `tasks/approvals.md`. Esperando humano antes de aceptar D / cerrar P6.
