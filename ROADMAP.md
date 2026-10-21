# ROADMAP — fábrica de Shorts

Fases del proyecto, dependencias y prioridades.
Estado de aprobación: `tasks/approvals.md`. Trabajo en curso: `tasks/active.md`.
Protocolo: `AGENTS.md` (ChatGPT planifica/revisa · Cursor implementa · GitHub es fuente de verdad).

## Prioridad actual

1. **`T-CHATTERBOX-002`:** fase 1 CLI — `accepted` con reservas I-R1–I-R4 / M-R1–M-R5 (2026-10-21). Smoke real MPS documentado. **Fase 2A** — `accepted` con reserva técnica (`exists`/`size`/`mtimeMs`) (2026-10-21). **Fase 2B** (caché SHA-256 ref + huella pins declarados; #4/#9 cerrados) — `accepted` con limitaciones (2026-10-21). **Fase 2C** alcance H1–H4 — **`accepted`** (2026-10-21; auditoría favorable; sin inferencia real; HEAD `0774e02`, padre `49321b9`). `conds.pt`/Perth pendientes. Piloto 001 OK (MPS). Inferencia real `proposed`. P8 `blocked`.
2. **`T-AV-QC-001`:** validación audiovisual real de las 4 familias — `accepted` (2026-10-19, OpenAI Cedar). P8 permanece `blocked`.
3. **P5 pulido logic-lateral** — `accepted` (2026-10-19). `T-POLISH-001` + `T-QC-LOUDNORM-001` `accepted`.
4. **P6 / `T-MULTIFORMAT-001`:** `accepted` (2026-10-19). A+B+C+D `accepted`.
5. **P7 / `T-STUDIO-001`:** `accepted` (2026-10-19). Studio/preview estable; AV → `T-AV-QC-001` `accepted`.
6. P3: `accepted` (2026-10-19, informe de revisión).
7. P4: `accepted` (2026-10-19, evidencia CI run 39237385007).

## Fases

| ID | Fase | Depende de | Prioridad | Estado |
| --- | --- | --- | --- | --- |
| P0 | Pipeline base (script → validate → voice → SRT → render → post → QC) | — | P0 | `accepted` |
| P1 | Formato oficial logic-lateral (beat + visuales + CTA comentar) | P0 | P0 | `accepted` |
| P2 | Validadores de acertijo + política de revisión humana | P0 | P0 | `accepted` |
| P3 | Gobernanza ChatGPT + Cursor + GitHub | — | P0 | `accepted` |
| P4 | CI GitHub Actions (`test` + `typecheck`) | — | P0 | `accepted` |
| P5 | Pulido logic-lateral (SFX, música, thumbnail, loudnorm) | P1 | P1 | `accepted` |
| P6 | Más familias de plantilla (math, memory, illusion) al nivel logic-lateral | P1, P2 | P2 | `accepted` |
| P7 | Studio / preview workflow documentado y estable | P0 | P2 | `accepted` |
| P8 | Publicación YouTube (metadata, upload, schedule) | P5 | P3 | `blocked` |

Estados: `proposed` · `approved` · `in_progress` · `review_required` · `accepted` · `blocked`  
(detalle en `AGENTS.md` / `tasks/approvals.md`).

## Dependencias técnicas

```text
P0 ──► P1 ──► P5 ──► P8 (futuro / blocked)
 │      │
 │      └──► P6 (accepted)
 ├──► P2
 ├──► P3
 ├──► P4
 └──► P7 (accepted)
```

## Criterios para avanzar de fase

1. Criterios de `tasks/active.md` cumplidos.
2. Pruebas listadas ejecutadas de verdad (`npm test`, `npm run typecheck`, renders si aplica).
3. Evidencia en `tasks/approvals.md` (paths, comandos, capturas/vídeo si aplica).
4. Estado `review_required` → humano marca `accepted`.
5. Siguiente fase queda en `proposed` hasta nuevo `approved` (o autorización expresa en chat Cursor).

## Trabajo en curso

| Campo | Valor |
| --- | --- |
| ID | `T-CHATTERBOX-002` (fase 1 `accepted` con reservas; fase 2A `accepted` con reserva técnica; fase 2B `accepted` con limitaciones; fase 2C `accepted` H1–H4) |
| Fase | P0–P7 `accepted` · `T-AV-QC-001` `accepted` · P8 `blocked` |
| Estado | Fases 1/2A/2B/2C cerradas acotadas (reservas 1/2A y limitaciones 2B **abiertas**). 2C **`accepted`** (H1–H4; 2026-10-21; sin inferencia real). Manual aún abierto: `conds.pt`, auditoría Perth. Inferencia real `proposed`. P8 no iniciado |
| Última cerrada (acotada) | `T-CHATTERBOX-002` fase 2C `accepted` H1–H4 (2026-10-21; HEAD `0774e02`); fase 2B `accepted` con limitaciones; fase 2A `accepted` con reserva técnica; fase 1 `accepted` con reservas + smoke MPS |
| Alcance activo | Sin alcance de implementación autorizado. Inferencia real / job con pesos en `proposed` (requiere nuevo `approved`). P8 `blocked` |
| Última cerrada (completa previa) | `T-AV-QC-001` `accepted` (2026-10-19) |
| Nota AV | 4 familias renderizadas (Cedar) + inspección humana aceptada |
| Nota P7 | `accepted`; audio Studio = `public/shorts/<id>/` |
| Nota P6 | Incorporación técnica + AV de evidencia vía `T-AV-QC-001` |
| Nota P5 | Limitación BGM documentada |
| P8 | `blocked` (sin cambios) |

## Fuera de alcance (hasta nueva decisión)

- Motion Canvas / Anime.js como motor paralelo.
- Generación de componentes Remotion por LLM.
- Upload automático a YouTube sin gate humano.
- Cambiar el beat oficial logic-lateral (u otros beats aceptados) sin actualizar plantilla + docs + approvals.
- Merge automático a `main` o publicación de vídeos sin aprobación expresa.
