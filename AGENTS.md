# AGENTS.md — guía para agentes de código

Reglas permanentes para Cursor y límites de autonomía.
Fuente de verdad operativa: este archivo + `ROADMAP.md` + `tasks/active.md` + `tasks/approvals.md` + GitHub.

## Roles (ChatGPT · Cursor · GitHub)

| Rol | Herramienta | Responsabilidad |
| --- | --- | --- |
| Planificación / revisión | ChatGPT (humano + chat) | Proponer fases, criticar planes, revisar informes |
| Implementación | Cursor (agente) | Código, tests, docs **dentro** del alcance aprobado |
| Fuente de verdad | GitHub + archivos versionados | Estado real del repo, PRs, CI, historial |

**Coordinación real:** solo mediante archivos en el repo, commits/PRs y lo que cada herramienta admite.
**No simular:** leer mensajes de ChatGPT, editar tareas “desde” ChatGPT, ni sincronizar chats automáticamente.

## Objetivo del repo

Fábrica automatizada de YouTube Shorts (acertijos) con Remotion. Dado un título, el pipeline genera guion, valida la solución, anima, narra, subtitula y renderiza.

## Formato oficial: logic-lateral

Referencia: `output/s4-19-interruptores/video.mp4` · plantilla: `data/templates/script-logic-lateral.json`.

**Beat obligatorio:**

`hook` → `instruction` (reglas) → `countdown` → `explanation` (pasos) → `reveal` → `outro` (**CTA a comentar**)

**Visuales del formato:** `logic-room`, `switch-sequence`, `bulb-state-reveal`, `countdown`, `text`.

**Flujo diario:**

```bash
cp data/templates/script-logic-lateral.json data/topics/mi-reto.json
# editar id, title, narrations, visuals…
npm run generar-short -- --input data/topics/mi-reto.json
```

Procedimiento completo: `docs/generar-short.md`.

## Gobernanza (leer siempre)

| Documento | Uso |
| --- | --- |
| `ROADMAP.md` | Fases, dependencias y prioridades |
| `docs/ARCHITECTURE.md` | Arquitectura técnica acordada |
| `docs/DECISIONS.md` | Decisiones y alternativas descartadas |
| `tasks/active.md` | Única tarea activa (esquema completo) |
| `tasks/approvals.md` | Estados de fase/tarea + evidencias; gate humano |
| `.cursor/rules/governance.mdc` | Protocolo de colaboración (siempre) |
| `.cursor/rules/shorts.mdc` | Reglas al tocar la fábrica de vídeos |

Antes de implementar: leer `tasks/active.md` y `tasks/approvals.md`. Si la petición no encaja o falta aprobación → **parar y preguntar** (no inventar alcance).

## Esquema obligatorio de una tarea

Toda tarea en `tasks/active.md` (y propuestas en `approvals`) debe incluir:

| Campo | Contenido |
| --- | --- |
| Identificador y fase | p. ej. `T-GOV-002` · fase `P5` |
| Objetivo y alcance | Qué sí / qué no |
| Archivos afectados previstos | Lista explícita |
| Dependencias | Fases/tareas previas |
| Criterios de aceptación | Verificables, checklist |
| Pruebas a ejecutar | Comandos concretos |
| Riesgos y pendientes | Bloqueos, dudas |
| Estado de aprobación | Uno de los estados abajo |

## Estados oficiales

| Estado | Quién lo pone | Significado |
| --- | --- | --- |
| `proposed` | Agente o humano | Plan listo; **no** implementar aún |
| `approved` | **Solo humano** (en `approvals.md` o en el chat de Cursor) | Autorizado a empezar |
| `in_progress` | Agente (tras `approved`) | Implementación en curso |
| `review_required` | Agente | Código/docs listos; informe de revisión; **espera humano** |
| `accepted` | **Solo humano** | Fase/tarea aceptada; se puede depender de ella |
| `blocked` | Agente o humano | Parada por dependencia, riesgo o decisión |

**Regla crítica:** terminar código **no** implica `accepted`. El agente deja `review_required` y espera. Nunca marcar `approved` / `accepted` por sí mismo.

## Protocolo de ejecución (cada tarea)

1. Leer `AGENTS.md`, `ROADMAP.md`, `tasks/active.md`, `tasks/approvals.md`.
2. Si el estado no es `approved` (ni el humano autorizó expresamente en esta conversación): preparar/actualizar el plan en estado `proposed` y **detenerse**.
3. Si está `approved`: implementar **solo** el alcance autorizado; pasar a `in_progress`.
4. Ejecutar las pruebas listadas; no afirmar éxito sin haberlas corrido.
5. Actualizar docs de la fase; poner la tarea en `review_required`.
6. Presentar informe de revisión (cambios, comandos, resultados, limitaciones, evidencias).
7. Dejar la **siguiente** fase/tarea en `proposed` y **esperar aprobación humana** antes de iniciar.

## Gate antes de fase importante

Antes de empezar una fase del `ROADMAP` (o tarea no trivial):

- Debe figurar `approved` en `tasks/approvals.md`, **o**
- El usuario debe autorizarla expresamente en la conversación de Cursor.

Sin eso: planificar y parar.

## Informe al cerrar una fase (plantilla)

```markdown
## Informe de revisión — <ID> / <fase>
- Cambios: …
- Comandos ejecutados: …
- Resultados: … (solo lo realmente corrido)
- Limitaciones: …
- Evidencias: paths / logs / artefactos
- Estado propuesto: review_required
- Siguiente fase: <ID> en proposed (esperando humano)
```

## Límites de autonomía

### Permitido sin preguntar (si la tarea está `approved` / autorizada)

- Editar código/tests/docs dentro del alcance de `tasks/active.md`.
- Ejecutar `npm test`, `npm run typecheck`, `npm run lint`.
- Generar shorts con plantillas locales / guion `--input` (voz mock o providers ya en `.env`).
- Corregir fallos de tests/typecheck introducidos por el cambio actual.
- Actualizar progreso en `tasks/active.md` y **proponer** filas/evidencias en `tasks/approvals.md` / `docs/DECISIONS.md` (sin marcar `approved`/`accepted`).

### Requiere aprobación explícita del humano

- Cambiar de fase en `ROADMAP.md` o marcar `approved` / `accepted` en `tasks/approvals.md`.
- Iniciar la fase siguiente tras un `review_required`.
- Nuevos formatos de acertijo / visuales / dependencias npm / APIs de pago.
- Refactors amplios, renombres masivos o cambios de arquitectura.
- Commits, push, PRs (salvo que el usuario lo pida).
- Merge a `main` / `master`.
- Publicar vídeos o subir a YouTube.
- Consumir servicios de pago no autorizados en la tarea.
- Operaciones destructivas (borrar `output/` de referencia, force-push, reset duro, etc.).
- Alterar composiciones `HelloRemotion` o `ScriptVideo`.
- Relajar validación de acertijos o `SHORTS_HUMAN_REVIEW_POLICY` hacia “aceptar sin revisar”.

### Prohibido

- Inventar soluciones de acertijo sin `puzzle-validator.ts` (si no aplica: `partial` / `pending_review`).
- Generar JSX/TSX de escenas con IA; solo datos declarativos + componentes existentes.
- Guardar secretos, API keys o credenciales en docs de coordinación (`AGENTS`, `ROADMAP`, `tasks/*`, `docs/*`). Secretos solo en `.env` (ver `.env.example`).
- Afirmar que una prueba, render o revisión tuvo éxito sin haberla ejecutado.
- Simular sincronización con ChatGPT u otras herramientas fuera de archivos/GitHub.
- Introducir Motion Canvas / Anime.js; GSAP/Three/Rive solo con `@remotion/*` + `docs/DECISIONS.md`.
- Ampliar el alcance más allá de `tasks/active.md` “porque conviene”.
- Interpretar “código terminado” como aprobación humana.

## Git y revisión

- Trabajar en ramas de funcionalidad o corrección.
- No push ni merge a `main` sin autorización explícita.
- No mezclar refactorizaciones ajenas a la tarea.
- No eliminar ni sobrescribir archivos del usuario / artefactos de referencia sin autorización.

## Reglas de producto

1. **No inventar soluciones.** Validador o `partial` / `pending_review`.
2. **Prompts en el repo**, no en el chat: `src/shorts/ai/prompts/`.
3. **Datos declarativos**, no JSX generado por IA. Componentes en `src/shorts/remotion/components/`.
4. **No romper** `HelloRemotion` ni `ScriptVideo`.
5. **Secretos** solo en `.env` (ver `.env.example`).
6. **Audio mock** siempre etiquetado (`isTestAudio`, banner, warnings).
7. Preferir plantillas locales / OSS; APIs externas opcionales vía env.
8. **Outro con CTA a comentar** en shorts logic-lateral (voz + `onScreenText` / `text` visual).

## Cómo añadir un formato

1. Extender `visualSchema` en `scene.schema.ts`
2. Añadir plantilla en `src/shorts/templates/`
3. Registrar detección en `templates/select.ts`
4. Añadir validador en `puzzle-validator.ts`
5. Añadir componente Remotion + rama en `ShortVideo.tsx`
6. Cubrir con tests en `tests/`
7. Registrar decisión en `docs/DECISIONS.md` y evidencias en `tasks/approvals.md`

## Comando principal

```bash
npm run generar-short -- "Título del acertijo"
# guion propio (recomendado):
npm run generar-short -- --input data/templates/script-logic-lateral.json
```

## Pruebas

```bash
npm test
npm run typecheck
```

CI: `.github/workflows/ci.yml` (test + typecheck en cada push/PR).

## Tooling de animación

Ver `docs/tooling.md`. Resumen: Remotion nativo + FFmpeg + Satori.
No usar Motion Canvas / Anime.js; GSAP/Three/Rive solo con paquete oficial `@remotion/*` y justificación.
Skill local: `.cursor/skills/remotion-shorts/SKILL.md`.
