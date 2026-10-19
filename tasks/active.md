# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

## ID

`T-GOV-001`

## Título

Instalar gobernanza Cursor + CI

## Alcance

- Actualizar `AGENTS.md` con límites de autonomía.
- Añadir `ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`.
- Añadir `tasks/active.md` y `tasks/approvals.md`.
- Añadir `.cursor/rules/shorts.mdc`.
- Añadir `.github/workflows/ci.yml` (test + typecheck).
- Enlazar docs desde `README.md` si hace falta.

## Fuera de alcance

- Nuevos formatos de acertijo.
- Cambios al pipeline Remotion / voz.
- Commits o PRs (salvo que el humano lo pida).

## Criterios de aceptación

- [x] Existen los archivos listados en el alcance.
- [x] `AGENTS.md` describe permitido / requiere aprobación / prohibido.
- [x] `ROADMAP.md` lista fases P0–P8 con dependencias.
- [x] CI ejecuta `npm test` y `npm run typecheck`.
- [ ] Humano confirma y actualiza `tasks/approvals.md` (P3/P4 → Aprobada).

## Notas

Tras aprobación: poner aquí la siguiente tarea (p. ej. pulido P5) o `ninguna` con alcance vacío.
