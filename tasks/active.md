# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-GOV-001`
- **Fase ROADMAP:** `P3` (Gobernanza ChatGPT + Cursor + GitHub)

## Estado de aprobación

`review_required`

> Autorización de esta entrega: el humano pidió explícitamente en Cursor instalar el protocolo de colaboración (sin iniciar implementación funcional de la fábrica).  
> **No** equivale a `accepted`: falta OK humano en `tasks/approvals.md`.

## Objetivo

Configurar el repositorio como desarrollo por fases: ChatGPT (plan/revisión), Cursor (implementación), GitHub (fuente de verdad). Conservar el trabajo existente de la fábrica.

## Alcance

- Adaptar `AGENTS.md`, `.cursor/rules/governance.mdc`, `.cursor/rules/shorts.mdc`.
- Adaptar `ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`.
- Adaptar `tasks/active.md` y `tasks/approvals.md` al esquema y estados oficiales.
- Enlazar el protocolo desde `README.md` si hace falta.
- Presentar la primera propuesta de roadmap (siguiente fase en `proposed`).

## Fuera de alcance

- Implementación funcional nueva de la fábrica de Shorts (visuales, pipeline, voz, formatos).
- Commits, push, PRs o merge a `main` (salvo petición explícita posterior).
- Consumo de APIs de pago / publicación de vídeos.

## Archivos afectados previstos

- `AGENTS.md`
- `ROADMAP.md`
- `docs/ARCHITECTURE.md`
- `docs/DECISIONS.md`
- `tasks/active.md`
- `tasks/approvals.md`
- `.cursor/rules/governance.mdc` (nuevo)
- `.cursor/rules/shorts.mdc`
- `README.md`

## Dependencias

- Legacy: P0–P2 (pipeline, logic-lateral, validadores) ya en repo.
- P4 (CI) ya existe en `.github/workflows/ci.yml` — revisión humana pendiente por separado.

## Criterios de aceptación

- [x] Existen/adaptados los archivos de gobernanza listados.
- [x] El esquema de tarea incluye id/fase, objetivo, archivos, dependencias, aceptación, pruebas, riesgos, estado.
- [x] Estados oficiales documentados y usados en `tasks/*`.
- [x] Queda explícito que código terminado ≠ aprobación humana.
- [x] Gate: fase importante requiere `approved` en approvals o autorización expresa en chat.
- [x] Prohibidos: merge `main`, publish, APIs de pago no autorizadas, destructivo, secretos en docs, afirmar éxito sin ejecutar, simular sync ChatGPT.
- [x] Primera propuesta de roadmap con siguiente fase en `proposed`.
- [ ] Humano marca P3 / `T-GOV-001` como `accepted` en `tasks/approvals.md`.

## Pruebas que deben ejecutarse

Para esta tarea (solo docs/reglas; sin cambio de runtime):

```bash
# Verificación de presencia y frontmatter de reglas Cursor
test -f AGENTS.md && test -f ROADMAP.md && test -f tasks/active.md && test -f tasks/approvals.md
test -f docs/ARCHITECTURE.md && test -f docs/DECISIONS.md
test -f .cursor/rules/governance.mdc && test -f .cursor/rules/shorts.mdc
# Opcional si se toca código de producto (no aplica ahora):
# npm test && npm run typecheck
```

## Riesgos y cuestiones pendientes

- Riesgo: agentes antiguos pueden ignorar estados si no leen `AGENTS.md` / `governance.mdc`.
- Pendiente: OK humano de P3 y P4 en `tasks/approvals.md`.
- Pendiente: elegir y aprobar la siguiente tarea (`T-POLISH-001` / P5 u otra).
- No hay sincronización automática ChatGPT ↔ Cursor; el humano copia/pega o edita archivos.

## Notas de progreso

- Protocolo implementado en docs; fábrica Shorts **no** modificada en esta entrega.
- Tras `accepted`: sustituir esta sección por la siguiente tarea aprobada, o dejar ID `ninguna` con alcance vacío.
