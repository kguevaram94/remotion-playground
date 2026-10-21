# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-002`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no inicia YouTube; no altera P0–P7 `accepted`)

## Estado de aprobación

`review_required` (**fase 2C** · alcance mínimo H1–H4) · fase 2B permanece `accepted` (con limitaciones) · fase 2A permanece `accepted` (con reserva técnica) · fase 1 permanece `accepted` (con reservas I-R*/M-R*)

> Aprobación humana 2026-10-21 (chat Cursor): **fase 2C** — alcance H1–H4 únicamente.  
> Implementación 2026-10-21: `approved` → `in_progress` → **`review_required`** (entrega H1–H4).  
> **Entregado:** H1 preflight; H2 integración offline (stub/fixtures); H3 documentación; H4 `npm test` + `typecheck`.  
> **No** autorizado / **no** hecho: inferencia real; descargas de modelos; cerrar reservas 1/2A/2B; declarar procedencia modelo/ref/checkpoints como verificada; cambiar umbrales QC / `publishEligibility` / P8 / YouTube; commit/push/merge/rebase.  
> Fase 2B: `accepted` con limitaciones — **abiertas / intactas**.  
> Fase 2A: `accepted` con reserva técnica (`exists`/`size`/`mtimeMs`) — **abierta / intacta**.  
> Fase 1: `accepted` con reservas I-R1–I-R4 / M-R1–M-R5 (**abiertas**).  
> P0–P7 `accepted`. `T-AV-QC-001` `accepted`. P8 `blocked`.  
> `T-CHATTERBOX-001` intacto (`proposed`).

## Objetivo

Integrar Chatterbox en el pipeline de producción **sin inferencia real**: preflight de configuración, pruebas offline con proveedor simulado + fixtures de loudnorm/QC, documentación de flujo/coste/límites de trazabilidad, y verificación `npm test` / `typecheck` — preservando la semántica P5 de loudnorm y `publishEligibility`, y **sin** afirmar procedencia verificada de modelo/ref/checkpoints.

## Alcance (sí — fase 2C · H1–H4)

### H1 — Preflight

1. Corregir la validación temprana de configuración de voz en `src/shorts/pipeline/run.ts` (para que Chatterbox/otros providers reales no queden fuera del assert).
2. Añadir tests para Chatterbox con configuración válida e incompleta.
3. Garantizar que una configuración inválida falla explícitamente y **nunca** degrada a mock.

### H2 — Integración offline

1. Probar el flujo de voz con proveedor Chatterbox **simulado**, normalización controlada y QC mediante fixtures.
2. Cubrir síntesis multisegmento, fallo en un segmento y ausencia de artefactos de éxito incorrectos.
3. Mantener la semántica existente de loudnorm y `publishEligibility` (sin cambiar umbrales ni criterios).

### H3 — Documentación

1. Documentar el flujo de voz, el coste de carga por segmento y las limitaciones de trazabilidad.
2. Distinguir expresamente `verified_provenance` de QC de loudnorm de la procedencia del modelo, los checkpoints y la referencia vocal.

### H4 — Verificación

1. Ejecutar `npm test` y `npm run typecheck`.
2. Entregar diffs y evidencias para revisión humana antes de aceptar la fase (`review_required`).

## Fuera de alcance (no)

- Inferencia real; descargas de modelos; install; daemon.
- Cerrar reservas fase 1 (I-R*/M-R*), reserva técnica 2A, o limitaciones 2B.
- Declarar procedencia de modelo / ref / checkpoints / venv como verificada.
- Hash de checkpoints; verificación live `pip freeze`.
- Modificar umbrales QC, semántica de `publishEligibility`, orden voice→loudnorm→render→post.
- P8 / YouTube / publicación; APIs de pago; providers ajenos al alcance (salvo no-regresión).
- Commit / push / merge / rebase.
- Autorización de job real con pesos (requiere **nuevo** `approved` humano independiente).

## Archivos afectados previstos

| Path | Rol |
| --- | --- |
| `src/shorts/pipeline/run.ts` | Preflight `assertConfigForMode` (H1) |
| `src/shorts/config/env.ts` | Ajuste de assert si hace falta (H1) |
| `src/shorts/pipeline/generate-voice.ts` | Solo si H2 exige cableado/observabilidad mínima sin cambiar contrato |
| `tests/unit/*` / `tests/integration/*` | Preflight + flujo stub/fixtures (H1–H2) |
| `docs/voice.md` (+ docs mínimos relacionados) | Flujo, coste N×cold-start, glosario provenance (H3) |
| `tasks/active.md`, `tasks/approvals.md`, `ROADMAP.md` | Gobernanza |

## Dependencias

- Fase 2B `accepted` con limitaciones (2026-10-21).
- Fase 2A `accepted` con reserva técnica (abierta).
- Fase 1 `accepted` con reservas I-R*/M-R* (abiertas).
- Autorización humana 2026-10-21 (chat Cursor): **fase 2C alcance H1–H4**.
- P8 `blocked`.

## Criterios de aceptación

- [x] H1: config Chatterbox incompleta → fallo explícito temprano; válida → no mock; tests cubren ambos casos.
- [x] H2: flujo offline stub + fixtures loudnorm/QC; multisegmento; fallo de segmento sin artefactos de éxito incorrectos; semántica loudnorm/`publishEligibility` intacta.
- [x] H3: docs con flujo, coste por segmento, y distinción `verified_provenance` (QC loudnorm P5) ≠ procedencia modelo/ref/checkpoints.
- [x] H4: `npm test` y `npm run typecheck` ejecutados de verdad; diffs/evidencias en informe `review_required`.
- [x] Reservas 1 / 2A / 2B **siguen abiertas**; sin claims de procedencia modelo/ref/checkpoints.
- [x] Sin inferencia real ni descargas en esta fase.
- [x] Sin commit/push/merge/rebase salvo petición humana aparte.
- [ ] Revisión humana de fase 2C — pendiente (`accepted` solo humano).

## Pruebas a ejecutar

```bash
npm test -- tests/unit/pipeline-voice-preflight.test.ts tests/integration/chatterbox-voice-qc-offline.test.ts tests/unit/voice-chatterbox.test.ts tests/unit/voice-chatterbox-cache.test.ts tests/unit/generate-voice-chatterbox-cache.test.ts tests/unit/narration-loudnorm.test.ts tests/unit/quality-check.test.ts
# → 7 files / 83 passed

npm test
# → 26 files / 158 passed

npm run typecheck
# → OK (tsc --noEmit)
```

## Riesgos y pendientes

- Multisegmento: coste N×cold-start documentado; sin daemon.
- Reserva 2A (`exists`/`size`/`mtimeMs`) y limitaciones 2B siguen: no elevar claims de identidad/procedencia.
- Reservas fase 1 (incl. `conds.pt`, Perth) abiertas; 2C **no** las cierra.
- Inferencia real = **fuera**; requiere autorización independiente.
- H2: render MP4 **simulado** en tests de QC (placeholder bytes + provenance); sin FFmpeg loudnorm real (stub `loudnormAudio`).

## Notas

- Estado tras entrega H1–H4 (2026-10-21): fase 2C **`review_required`**. Esperar `accepted` humano.
- Fases 1/2A/2B aceptadas acotadas; reservas/limitaciones **intactas**.
- Inferencia real sigue `proposed` hasta nuevo `approved`.
