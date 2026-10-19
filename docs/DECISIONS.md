# Decisiones — registro

Decisiones tomadas y alternativas descartadas.
Formato: fecha · decisión · contexto · alternativa · consecuencia.

---

## D001 — Remotion como único motor de vídeo

- **Fecha:** 2025-Q4
- **Decisión:** Toda animación de Shorts vive en Remotion (`useCurrentFrame` / `interpolate` / `spring`).
- **Alternativas descartadas:** Motion Canvas (motor paralelo); Anime.js (sin sync oficial de frames).
- **Consecuencia:** FFmpeg/Satori solo en post-proceso. GSAP/Three/Rive solo vía `@remotion/*` y con justificación.

## D002 — Datos declarativos, no código generado por IA

- **Fecha:** 2025-Q4
- **Decisión:** El LLM/plantilla emite JSON (`VideoScript` + visuals Zod). Los componentes React son código de repo.
- **Alternativas descartadas:** Generar TSX de escenas con el modelo; eval de strings.
- **Consecuencia:** Extender formato = schema + componente + plantilla + tests (ver `AGENTS.md`).

## D003 — Validación de acertijos en código

- **Fecha:** 2025-Q4
- **Decisión:** `puzzle-validator.ts` es la fuente de verdad; si no hay validador, estado `partial` / `pending_review`.
- **Alternativas descartadas:** Confiar en la autoevaluación del LLM.
- **Consecuencia:** Política humana vía `SHORTS_HUMAN_REVIEW_POLICY`.

## D004 — Formato oficial logic-lateral

- **Fecha:** 2026-Q1
- **Decisión:** Beat fijo hook → instruction → countdown → explanation → reveal → outro (CTA comentar). Visuales tipados propios.
- **Alternativas descartadas:** Beat libre por prompt; outro sin CTA.
- **Referencia:** `output/s4-19-interruptores/`, `data/templates/script-logic-lateral.json`.

## D005 — Preservar composiciones playground

- **Fecha:** 2025-Q4
- **Decisión:** No modificar el contrato de `HelloRemotion` ni `ScriptVideo` al evolucionar `ShortVideo`.
- **Alternativa descartada:** Unificar todo en una sola composición.
- **Consecuencia:** `ShortVideo` es la superficie de la fábrica; el playground sigue para demos.

## D006 — Proveedores de voz intercambiables

- **Fecha:** 2025-Q4 / 2026-Q1
- **Decisión:** `VoiceProvider` con mock (etiquetado), macOS `say`, OpenAI TTS (y otros opcionales).
- **Alternativa descartada:** Un solo vendor hardcodeado.
- **Consecuencia:** Audio mock siempre con `isTestAudio` + banner; secretos solo en `.env`.

## D007 — Gobernanza de agentes

- **Fecha:** 2026-04-19
- **Decisión:** Autonomía limitada por `AGENTS.md` + `tasks/active.md`; fases en `ROADMAP.md` con gate en `tasks/approvals.md`.
- **Alternativa descartada:** Agente con alcance abierto en cada chat.
- **Consecuencia:** Cambios de arquitectura/fase requieren aprobación humana explícita.

## D008 — Protocolo ChatGPT + Cursor + GitHub

- **Fecha:** 2026-10-19
- **Decisión:** Desarrollo por fases con roles fijos: ChatGPT (plan/revisión), Cursor (implementación), GitHub + archivos versionados (fuente de verdad). Estados: `proposed` → `approved` → `in_progress` → `review_required` → `accepted` (o `blocked`). Código terminado ≠ aceptación humana.
- **Alternativas descartadas:** Sync automático entre chats; que el agente marque fases como aceptadas; alcance abierto entre fases.
- **Consecuencia:** Antes de fase importante hace falta `approved` en `tasks/approvals.md` o autorización expresa en Cursor; al cerrar, informe + `review_required` y siguiente fase en `proposed`. Sin merge a `main`, publish, APIs de pago no autorizadas ni ops destructivas sin OK humano. Sin secretos en docs de coordinación.

---

Al descartar o adoptar algo nuevo: añadir **D00N** aquí y enlazar desde el PR / `tasks/approvals.md`.
