# ROADMAP — fábrica de Shorts

Fases del proyecto, dependencias y prioridades.
Estado de aprobación: `tasks/approvals.md`. Trabajo en curso: `tasks/active.md`.
Protocolo: `AGENTS.md` (ChatGPT planifica/revisa · Cursor implementa · GitHub es fuente de verdad).

## Prioridad actual

1. **P5 pulido logic-lateral** — `accepted` (2026-10-19). `T-POLISH-001` + `T-QC-LOUDNORM-001` `accepted` (limitación audiovisual documentada en `tasks/approvals.md`).
2. **P6 / `T-MULTIFORMAT-001`:** entrega **A** `accepted` (2026-10-19); B/C/D y la fase P6 siguen `proposed` (B requiere nuevo `approved`). Alternativas: P7 (Studio) o P8 (`blocked`).
3. P3: `accepted` (2026-10-19, informe de revisión).
4. P4: `accepted` (2026-10-19, evidencia CI run 39237385007).

## Fases

| ID | Fase | Depende de | Prioridad | Estado |
| --- | --- | --- | --- | --- |
| P0 | Pipeline base (script → validate → voice → SRT → render → post → QC) | — | P0 | `accepted` |
| P1 | Formato oficial logic-lateral (beat + visuales + CTA comentar) | P0 | P0 | `accepted` |
| P2 | Validadores de acertijo + política de revisión humana | P0 | P0 | `accepted` |
| P3 | Gobernanza ChatGPT + Cursor + GitHub | — | P0 | `accepted` |
| P4 | CI GitHub Actions (`test` + `typecheck`) | — | P0 | `accepted` |
| P5 | Pulido logic-lateral (SFX, música, thumbnail, loudnorm) | P1 | P1 | `accepted` |
| P6 | Más familias de plantilla (math, memory, illusion) al nivel logic-lateral | P1, P2 | P2 | `proposed` |
| P7 | Studio / preview workflow documentado y estable | P0 | P2 | `proposed` |
| P8 | Publicación YouTube (metadata, upload, schedule) | P5 | P3 | `blocked` |

Estados: `proposed` · `approved` · `in_progress` · `review_required` · `accepted` · `blocked`  
(detalle en `AGENTS.md` / `tasks/approvals.md`).

## Dependencias técnicas

```text
P0 ──► P1 ──► P5 ──► P8 (futuro / blocked)
 │      │
 │      └──► P6
 ├──► P2
 ├──► P3
 └──► P4
```

## Criterios para avanzar de fase

1. Criterios de `tasks/active.md` cumplidos.
2. Pruebas listadas ejecutadas de verdad (`npm test`, `npm run typecheck`, renders si aplica).
3. Evidencia en `tasks/approvals.md` (paths, comandos, capturas/vídeo si aplica).
4. Estado `review_required` → humano marca `accepted`.
5. Siguiente fase queda en `proposed` hasta nuevo `approved` (o autorización expresa en chat Cursor).

## Primera propuesta de siguiente trabajo

Tras `accepted` P5 — propuesta registrada en `proposed` hasta autorización humana:

| Campo | Valor |
| --- | --- |
| ID | `T-MULTIFORMAT-001` |
| Fase | P6 |
| Estado | P6 `proposed` · entrega A `accepted` · B/C/D `proposed` |
| Objetivo | Contrato multiformato (A, cerrado); luego math/memory/illusion al nivel logic-lateral si se aprueban B–D, sin alterar el beat oficial |
| Depende de | P1, P2 (`accepted`); P5 (`accepted`); A `accepted` |
| Gate | A `accepted` 2026-10-19. B/C/D y cierre de P6 requieren nuevo `approved` / aceptación por entrega |
| Entregas | A contrato (`accepted`) · B math · C memory · D illusion (`proposed`) |
| Nota A | Regresión = validate only (no render / no inspección AV). Validación narrativa math/memory/illusion pendiente B–D |
| Nota P5 | Aceptación con limitación audiovisual documentada (sin MP4 no-mock auditado) |

## Fuera de alcance (hasta nueva decisión)

- Motion Canvas / Anime.js como motor paralelo.
- Generación de componentes Remotion por LLM.
- Upload automático a YouTube sin gate humano.
- Cambiar el beat oficial logic-lateral sin actualizar plantilla + docs + approvals.
- Merge automático a `main` o publicación de vídeos sin aprobación expresa.
