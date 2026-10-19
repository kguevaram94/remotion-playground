# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-MULTIFORMAT-001` · entrega **C** (familia memory)
- **Fase ROADMAP:** `P6` (sigue `proposed`; A+B `accepted`; D `proposed`)

## Estado de aprobación

`review_required`

> Entrega C implementada (2026-10-19). Esperando revisión humana.  
> D y P6 permanecen `proposed`. Sin iniciar D. Sin commit/push/merge.

## Objetivo

Familia **memory** al nivel de plantilla oficial: JSON, beat propio, builder, validador (fases + narrativa), componente, tests y docs.

## Alcance entregado (C)

1. `data/templates/script-memory.json` + README.
2. Beat `hook→puzzle→countdown→hint→reveal→outro` en registry.
3. Builder + `family: 'memory'` + CTA comentar.
4. `validateMemoryChallenge` (ask excluye missingId) + `validateMemoryNarrative`.
5. Pulido `MemoryChallenge.tsx`.
6. Tests + validate memory/math/logic-lateral.
7. Docs D013.

## Criterios de aceptación

- [x] `script-memory.json` valida → `auto_validated`.
- [x] Fases show→hide→ask→reveal + answerKey coherentes.
- [x] Beat memory propio; logic-lateral intacto.
- [x] Regresión math + logic-lateral validate OK.
- [x] `npm test` 92 · `typecheck` OK.
- [x] Sin deps; sin publish.
- [ ] Humano marca `accepted` (o rechaza) para C.

## Pruebas ejecutadas

```bash
npm test          # 19 files / 92 tests passed
npm run typecheck # OK
npm run short -- --input data/templates/script-memory.json --mode validate --id t-multiformat-c-memory
# → auto_validated
npm run short -- --input data/templates/script-math.json --mode validate --id t-multiformat-c-math-regression
npm run short -- --input data/templates/script-logic-lateral.json --mode validate --id t-multiformat-c-logic-regression
```

## Limitaciones

- Validate only (no render/AV).
- Fixture memory ≠ cobertura exhaustiva de edge cases.
- Illusion (D) pendiente.

## Notas

- Informe en `tasks/approvals.md`. Esperando humano antes de D.
