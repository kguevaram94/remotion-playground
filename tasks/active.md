# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-QC-LOUDNORM-001`
- **Fase ROADMAP:** `P5`

## Estado de aprobación

`review_required`

> Gate loudnorm + publishEligibility implementado. Esperando revisión humana. **No** marcar `accepted` el agente.

## Objetivo

Definir y aplicar el gate de calidad de loudnorm: bloquear el QC técnico cuando la voz es real y el check obligatorio falla; distinguir elegibilidad de publicación; mantener `mock_omitted` como excepción de pruebas no publicable.

## Alcance

- Voz real + loudnorm `failed` / `unverified` / no normalizado → blocking → `report.ok=false` → fase `quality_check` failed.
- `publishEligibility.eligible` + `reasons` en `report.json`.
- Mock nunca publicable aunque pase QC técnico.
- BGM vacío: warning solo (no bloquea QC ni elegibilidad por defecto).
- Sin migración automática de jobs antiguos; documentar revalidación.
- Tests + docs; conservar provenance de `T-POLISH-001`.

## Fuera de alcance

Respetado: sin pago/YouTube/deps/beat/formatos/commit/push/merge/`accepted` automático.

## Archivos afectados previstos

- `src/shorts/pipeline/quality-check.ts`
- `tests/unit/quality-check.test.ts`
- `docs/generar-short.md`, `docs/tooling.md`, `docs/troubleshooting.md`, `docs/DECISIONS.md` (D010)
- `tasks/active.md`, `tasks/approvals.md`

## Dependencias

- Remediación loudnorm / provenance de `T-POLISH-001` (en código).
- Autorización humana 2026-10-19 en chat Cursor.

## Criterios de aceptación

- [x] Voz real + loudnorm fallido/unverified → blocking, `report.ok=false`, fase failed.
- [x] `publishEligibility` en report; mock nunca `eligible:true`.
- [x] Voz real elegible solo con gate loudnorm + demás controles técnicos.
- [x] Docs: `eligible=true` ≠ validación audiovisual humana ni inspección del audio del MP4.
- [x] BGM vacío no bloquea QC ni elegibilidad por defecto.
- [x] Sin migración automática; docs de revalidación de jobs antiguos.
- [x] Tests de propuesta + mock nunca elegible + bloqueo voz real.
- [x] `npm test` y `npm run typecheck` OK.
- [ ] Revisión humana; **no** `accepted` automático.

## Pruebas que deben ejecutarse

```bash
npm test
npm run typecheck
```

Ejecutados: **16 files / 72 tests OK**, typecheck OK.

## Riesgos y cuestiones pendientes

- Jobs antiguos `completed` sin provenance válida no se reevalúan solos (documentado).
- `mode=post` / `--mode voice` para revalidar.

## Notas de progreso

- Git pre-flight: `main` limpio, sync con `origin/main` (`a4001a7`).
- Implementación: `applyNarrationLoudnormGate` + `computePublishEligibility` + `report.publishEligibility`.
- Entrega en `review_required`.
