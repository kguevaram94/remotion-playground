# ROADMAP — fábrica de Shorts

Fases del proyecto, dependencias y prioridades.
Estado de aprobación: `tasks/approvals.md`. Trabajo en curso: `tasks/active.md`.
Protocolo: `AGENTS.md` (ChatGPT planifica/revisa · Cursor implementa · GitHub es fuente de verdad).

## Prioridad actual

1. **P5 pulido logic-lateral** — `T-POLISH-001` en `proposed` (no iniciar sin `approved`).
2. Solo después: P6 (más formatos), P7 (Studio), P8 (publicación) según decisión humana.
3. P3/P4: `accepted` (2026-10-19).

## Fases

| ID | Fase | Depende de | Prioridad | Estado |
| --- | --- | --- | --- | --- |
| P0 | Pipeline base (script → validate → voice → SRT → render → post → QC) | — | P0 | `accepted` |
| P1 | Formato oficial logic-lateral (beat + visuales + CTA comentar) | P0 | P0 | `accepted` |
| P2 | Validadores de acertijo + política de revisión humana | P0 | P0 | `accepted` |
| P3 | Gobernanza ChatGPT + Cursor + GitHub | — | P0 | `accepted` |
| P4 | CI GitHub Actions (`test` + `typecheck`) | — | P0 | `accepted` |
| P5 | Pulido logic-lateral (SFX, música, thumbnail, loudnorm) | P1 | P1 | `proposed` |
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

Tras aceptar P3/P4:

| Campo | Valor propuesto |
| --- | --- |
| ID | `T-POLISH-001` |
| Fase | P5 |
| Estado | `proposed` |
| Objetivo | Calidad de producción del short logic-lateral de referencia |
| Alcance tentativo | SFX, BGM, thumbnail, loudnorm / QC audio-visual; docs de uso |
| Fuera de alcance | Nuevos formatos; YouTube upload; cambios de beat oficial |
| Gate | Requiere `approved` en `tasks/approvals.md` o OK explícito en Cursor |

## Fuera de alcance (hasta nueva decisión)

- Motion Canvas / Anime.js como motor paralelo.
- Generación de componentes Remotion por LLM.
- Upload automático a YouTube sin gate humano.
- Cambiar el beat oficial logic-lateral sin actualizar plantilla + docs + approvals.
- Merge automático a `main` o publicación de vídeos sin aprobación expresa.
