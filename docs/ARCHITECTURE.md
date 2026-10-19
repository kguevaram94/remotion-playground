# Arquitectura — fábrica de Shorts

Arquitectura técnica acordada. Cambios estructurales requieren entrada en `docs/DECISIONS.md` y aprobación en `tasks/approvals.md` (estados `approved` / `accepted`; ver `AGENTS.md`).

## Colaboración (proceso, no runtime)

| Pieza | Rol |
| --- | --- |
| ChatGPT | Planificación y revisión (humano media; sin sync de chats) |
| Cursor | Implementación acotada a `tasks/active.md` |
| GitHub | Fuente de verdad (código, CI, historial) |

La coordinación vive en archivos versionados (`ROADMAP.md`, `tasks/*`, este doc, `DECISIONS.md`). No forma parte del pipeline de render.

## Resumen

El repositorio combina el playground Remotion existente (`HelloRemotion`, `ScriptVideo`) con una fábrica modular de YouTube Shorts en `src/shorts/`.

Flujo:

```text
título / --input JSON
      → guion (IA o plantilla)
      → validación de acertijo
      → escenas
      → voz
      → subtítulos SRT
      → render Remotion (ShortVideo)
      → post-proceso (FFmpeg + Satori)
      → QC
      → output/<id>/
```

## Capas

| Capa | Ruta | Responsabilidad |
| --- | --- | --- |
| CLI | `src/cli/short.ts` | Entrada de usuario y modos |
| Config | `src/shorts/config/` | Defaults + env |
| Dominio | `src/shorts/domain/` | Esquemas Zod + validadores |
| IA | `src/shorts/ai/` | Proveedor LLM + prompts versionados |
| Plantillas | `src/shorts/templates/` | Generadores deterministas por familia |
| Pipeline | `src/shorts/pipeline/` | Fases persistentes y reanudación |
| Voz | `src/shorts/voice/` | `VoiceProvider` (mock / macOS / OpenAI / …) |
| Subtítulos | `src/shorts/subtitles/` | SRT + alineación |
| Remotion | `src/shorts/remotion/` | Composición `ShortVideo` + componentes |
| Media | `src/shorts/media/` | FFmpeg, thumbnail, bundle cache, BGM |
| Storage | `src/shorts/storage/` | Estado del trabajo + locks |

## Composición Remotion

`ShortVideo` (registrada en `src/Composition.tsx`) recibe props declarativas:

- `script` — `VideoScript` completo
- `subtitles` — cues ya parseados
- `audioSrc` — URL `file://` al WAV
- `isTestAudio` — muestra banner si el audio es mock

**Contrato:** no se ejecuta código generado por el modelo; solo datos JSON tipados (`scene.schema.ts` / `script.schema.ts`).

Animaciones: `useCurrentFrame()` + `interpolate` / `spring`. FFmpeg y Satori van en **post-proceso**, no dentro de la composición.

## Formato oficial: logic-lateral

Beat: `hook` → `instruction` → `countdown` → `explanation` → `reveal` → `outro` (CTA comentar).

Visuales: `logic-room`, `switch-sequence`, `bulb-state-reveal`, `countdown`, `text`.

Plantilla: `data/templates/script-logic-lateral.json`.
Referencia render: `output/s4-19-interruptores/`.

## Contrato multiformato (entrega A · `T-MULTIFORMAT-001`)

Familias registradas en `src/shorts/templates/registry.ts` (`TemplateFamily` en `templates/types.ts`):

| `family` | `format` típico | Notas |
| --- | --- | --- |
| `logic-lateral` | `logic-puzzle` | Beat oficial exacto; referencia de producción |
| `logic-puzzle` | `logic-puzzle` | Genérico (p. ej. nine-dots); sin secuencia logic-lateral |
| `math` | `math-puzzle` | Beat específico: entrega B |
| `memory` | `memory-challenge` | Beat específico: entrega C |
| `illusion` | `optical-illusion` | Beat específico: entrega D |
| `find-different` | `find-different` | Scaffolding existente |

- Campo JSON opcional `family` (Zod). Si falta, `resolveFamily` / `inferFamilyId` infieren de `format` + visuales (`logic-room` / `switch-sequence` / `bulb-state-reveal` → `logic-lateral`).
- Familia desconocida → error explícito (`UnknownTemplateFamilyError` / rechazo Zod).
- **Beat común** (`beat-check.ts`): presencia de `hook`, `reveal`, `outro` (sin imponer orden).
- **Beat de familia:** solo si la familia declara `exactSequence` (hoy: logic-lateral). CTA comentar = `preferCommentCta` (aviso, no bloqueo).
- Validación de acertijo por familia: `validateFamilyPuzzle` en `puzzle-validator.ts` (separada del beat checker).

Scripts legacy sin `family` siguen siendo válidos (sin migración).

## Validación de acertijos

La validación es **código**, no autoevaluación del LLM:

- Cuadrículas find-different
- Matemáticas / cerillas (evaluación aritmética)
- 9 puntos (cobertura geométrica de segmentos)
- Conteo de cuadrados
- Memoria (IDs)
- Ilusiones (parcial / revisión humana)
- Logic-lateral / three-switches (plantilla + checks de dominio)

Orquestación: `validateScriptPuzzles` → familia resuelta → beat común → beat de familia → validador específico.

Política: `SHORTS_HUMAN_REVIEW_POLICY` (`warn_and_continue` | bloqueo según config).

## Reanudación y artefactos

`metadata.json` guarda fases, hashes y artefactos. `npm run short:resume -- --id <id>` salta fases `done`. Lock file `.lock` evita carreras.

Fases del job: `generating_script` → `validating` → `planning_scenes` → `generating_voice` → `generating_subtitles` → `rendering` → `post_process` → `quality_check` → `completed`.

## Fronteras que no se cruzan

| Permitido | No permitido |
| --- | --- |
| Nuevos componentes en `remotion/components/` | JSX generado por IA en runtime |
| Plantillas en `templates/` + detección en `select.ts` | Romper `HelloRemotion` / `ScriptVideo` |
| Prompts versionados en `ai/prompts/` | Prompts solo en el chat del agente |
| Post FFmpeg/Satori en `media/` | Timelines wall-clock (Anime.js, GSAP sin `@remotion/gsap`) |

## Docs relacionadas

- Uso diario: `docs/generar-short.md`, `docs/usage.md`
- Tooling: `docs/tooling.md`
- Voz: `docs/voice.md`, `docs/openai-tts.md`
- Decisiones: `docs/DECISIONS.md`
