# AGENTS.md — guía para agentes de código

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

## Reglas

1. **No inventar soluciones.** Toda respuesta de acertijo debe pasar por `src/shorts/domain/puzzle-validator.ts` o quedar marcada como `partial` / `pending_review`.
2. **Prompts en el repo**, no en el chat: `src/shorts/ai/prompts/`.
3. **Datos declarativos**, no JSX generado por IA. Los componentes viven en `src/shorts/remotion/components/`.
4. **No romper** las composiciones existentes `HelloRemotion` y `ScriptVideo`.
5. **Secretos** solo en `.env` (ver `.env.example`). Nunca loguear API keys.
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

## Tooling de animación

Ver `docs/tooling.md`. Resumen: Remotion nativo + FFmpeg + Satori.
No usar Motion Canvas / Anime.js; GSAP/Three/Rive solo con paquete oficial `@remotion/*` y justificación.
Skill local: `.cursor/skills/remotion-shorts/SKILL.md`.
