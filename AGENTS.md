# AGENTS.md — guía para agentes de código

Reglas permanentes para Cursor y límites de autonomía.
Fuente de verdad operativa: este archivo + `ROADMAP.md` + `tasks/active.md` + `tasks/approvals.md`.

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
| `tasks/active.md` | Única tarea activa, alcance y aceptación |
| `tasks/approvals.md` | Fases aprobadas / pendientes + evidencias |
| `.cursor/rules/shorts.mdc` | Reglas al tocar la fábrica de vídeos |

Antes de implementar: comprobar `tasks/active.md`. Si la petición no encaja, **parar y preguntar** (no inventar alcance).

## Límites de autonomía

### Permitido sin preguntar

- Editar código/tests/docs dentro del alcance de `tasks/active.md`.
- Ejecutar `npm test`, `npm run typecheck`, `npm run lint`.
- Generar shorts con plantillas locales / guion `--input` (voz mock o providers ya configurados en `.env`).
- Corregir fallos de tests/typecheck introducidos por el cambio actual.
- Actualizar `tasks/active.md` (progreso) y proponer entradas en `tasks/approvals.md` / `docs/DECISIONS.md`.

### Requiere aprobación explícita del humano

- Cambiar de fase de `ROADMAP.md` o marcar una fase como aprobada en `tasks/approvals.md`.
- Nuevos formatos de acertijo / visuales / dependencias npm / APIs de pago.
- Refactors amplios, renombres masivos o cambios de arquitectura.
- Commits, push, PRs (salvo que el usuario lo pida).
- Borrar o reescribir artefactos en `output/` de shorts ya publicados/referencia.
- Alterar composiciones `HelloRemotion` o `ScriptVideo`.
- Relajar validación de acertijos o la política `SHORTS_HUMAN_REVIEW_POLICY` hacia “aceptar sin revisar”.

### Prohibido

- Inventar soluciones de acertijo sin pasar por `src/shorts/domain/puzzle-validator.ts` (si no aplica: marcar `partial` / `pending_review`).
- Generar JSX/TSX de escenas con IA; solo datos declarativos + componentes existentes.
- Loguear o commitear secretos (`.env`, API keys).
- Introducir Motion Canvas / Anime.js; GSAP/Three/Rive solo con `@remotion/*` y decisión en `docs/DECISIONS.md`.
- Ampliar el alcance más allá de `tasks/active.md` “porque conviene”.

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
