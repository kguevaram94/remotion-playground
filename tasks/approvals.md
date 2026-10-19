# Aprobaciones de fases

Registro de fases del `ROADMAP.md`: aprobadas, pendientes y evidencias.
Solo el humano marca **Aprobada**. El agente puede proponer filas y evidencias.

## Leyenda

| Estado | Significado |
| --- | --- |
| Aprobada | Humano OK; se puede depender de ella |
| En revisión | Evidencias listas; falta OK humano |
| Pendiente | No iniciada o incompleta |
| Bloqueada | Espera dependencia o decisión |

## Tablero

| Fase | Título | Estado | Evidencias | Aprobado por | Fecha |
| --- | --- | --- | --- | --- | --- |
| P0 | Pipeline base | Aprobada | `src/shorts/pipeline/`, `npm run short`, tests integración | — (legado) | 2026-Q1 |
| P1 | Formato logic-lateral | Aprobada | `data/templates/script-logic-lateral.json`, `output/s4-19-interruptores/video.mp4` | — (legado) | 2026-Q1 |
| P2 | Validadores | Aprobada | `puzzle-validator.ts`, `tests/unit/puzzle-validator.test.ts` | — (legado) | 2026-Q1 |
| P3 | Gobernanza Cursor | En revisión | `AGENTS.md`, `ROADMAP.md`, `tasks/*`, `.cursor/rules/shorts.mdc`, `docs/DECISIONS.md` D007 | _pendiente_ | — |
| P4 | CI GitHub Actions | En revisión | `.github/workflows/ci.yml` | _pendiente_ | — |
| P5 | Pulido logic-lateral | Pendiente | — | — | — |
| P6 | Más familias plantilla | Pendiente | — | — | — |
| P7 | Studio/preview estable | Pendiente | — | — | — |
| P8 | Publicación YouTube | Bloqueada | Descartado por ahora (`ROADMAP` / D-future) | — | — |

## Cómo aprobar

1. Revisar criterios de `tasks/active.md` y diff.
2. Correr localmente: `npm test && npm run typecheck`.
3. Actualizar la fila: Estado → **Aprobada**, rellenar “Aprobado por” + fecha.
4. Si se rechaza: Estado → **Pendiente** + nota en evidencias.
