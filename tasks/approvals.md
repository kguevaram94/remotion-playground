# Aprobaciones de fases y tareas

Registro de fases (`ROADMAP.md`) y tareas relevantes.
**Solo el humano** marca `approved` (autorizar inicio) y `accepted` (cerrar con OK).
El agente puede proponer filas, evidencias y pasar a `in_progress` / `review_required` / `blocked`.

GitHub es la fuente de verdad versionada; ChatGPT no escribe aquí directamente.

## Estados oficiales

| Estado | Significado |
| --- | --- |
| `proposed` | Plan listo; no implementar |
| `approved` | Humano autorizó el inicio |
| `in_progress` | Implementación en curso |
| `review_required` | Entrega lista; falta revisión humana |
| `accepted` | Humano aceptó el resultado |
| `blocked` | Parada por dependencia o decisión |

Código terminado ≠ `accepted`.

## Tablero de fases

| Fase | Título | Estado | Evidencias | Aprobado/aceptado por | Fecha |
| --- | --- | --- | --- | --- | --- |
| P0 | Pipeline base | `accepted` | `src/shorts/pipeline/`, `npm run short`, tests integración | legado | 2026-Q1 |
| P1 | Formato logic-lateral | `accepted` | `data/templates/script-logic-lateral.json`, `output/s4-19-interruptores/video.mp4` | legado | 2026-Q1 |
| P2 | Validadores | `accepted` | `puzzle-validator.ts`, `tests/unit/puzzle-validator.test.ts` | legado | 2026-Q1 |
| P3 | Gobernanza ChatGPT+Cursor+GitHub | `review_required` | `AGENTS.md`, `ROADMAP.md`, `tasks/*`, `.cursor/rules/governance.mdc`, `.cursor/rules/shorts.mdc`, `docs/DECISIONS.md` D007–D008 | _pendiente humano_ | — |
| P4 | CI GitHub Actions | `review_required` | `.github/workflows/ci.yml` | _pendiente humano_ | — |
| P5 | Pulido logic-lateral | `proposed` | Ver propuesta `T-POLISH-001` abajo | — | — |
| P6 | Más familias plantilla | `proposed` | Depende P1/P2 + decisión de alcance | — | — |
| P7 | Studio/preview estable | `proposed` | Depende P0 | — | — |
| P8 | Publicación YouTube | `blocked` | Descartado por ahora (`ROADMAP` / D-future) | — | — |

## Tablero de tareas

| ID | Fase | Título | Estado | Notas |
| --- | --- | --- | --- | --- |
| `T-GOV-001` | P3 | Protocolo colaboración + docs gobernanza | `review_required` | Autorizado en chat Cursor para docs; falta `accepted` |
| `T-CI-001` | P4 | CI test + typecheck | `review_required` | Workflow ya en repo; falta `accepted` |
| `T-POLISH-001` | P5 | Pulido logic-lateral (SFX, música, thumb, loudnorm) | `proposed` | **No iniciar** hasta `approved` |

## Cómo aprobar el **inicio** de una fase/tarea

1. Revisar plan en `tasks/active.md` (o propuesta en este archivo / ChatGPT pegada al repo).
2. Cambiar estado → `approved` y firmar “Aprobado por” + fecha, **o** autorizar expresamente en el chat de Cursor.
3. Sin eso, el agente no implementa.

## Cómo **aceptar** una entrega

1. Revisar diff + informe de revisión del agente.
2. Correr localmente lo pertinente (`npm test && npm run typecheck`, render, etc.).
3. Estado → `accepted`; firmar + fecha.
4. Si se rechaza: volver a `proposed` o `blocked` + nota en evidencias.
5. Autorizar por separado la siguiente tarea (`proposed` → `approved`).

## Propuesta siguiente (no aprobada)

### `T-POLISH-001` · P5 · `proposed`

- **Objetivo (borrador):** elevar calidad del short logic-lateral de referencia (SFX, BGM, thumbnail, loudnorm) sin cambiar el beat oficial.
- **Fuera de alcance (borrador):** nuevos formatos; upload YouTube; merge a main automático.
- **Depende de:** P3/P4 en `accepted` (recomendado) y autorización humana.
- **Pruebas previstas:** `npm test`, `npm run typecheck`, render de plantilla logic-lateral si se autoriza voz/render.
