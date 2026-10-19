# Arquitectura — fábrica de Shorts

## Resumen

El repositorio combina el playground Remotion existente (`HelloRemotion`, `ScriptVideo`) con una fábrica modular de YouTube Shorts en `src/shorts/`.

Flujo:

```text
título → guion (IA o plantilla) → validación de acertijo → escenas
      → voz → subtítulos SRT → render Remotion → QC → output/<id>/
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
| Voz | `src/shorts/voice/` | `VoiceProvider` (mock / macOS / OpenAI) |
| Subtítulos | `src/shorts/subtitles/` | SRT + alineación |
| Remotion | `src/shorts/remotion/` | Composición `ShortVideo` + componentes |
| Storage | `src/shorts/storage/` | Estado del trabajo + locks |

## Composición Remotion

`ShortVideo` (registrada en `src/Composition.tsx`) recibe props declarativas:

- `script` — `VideoScript` completo
- `subtitles` — cues ya parseados
- `audioSrc` — URL `file://` al WAV
- `isTestAudio` — muestra banner si el audio es mock

No se ejecuta código generado por el modelo: solo datos JSON.

## Validación de acertijos

La validación es **código**, no autoevaluación del LLM:

- Cuadrículas find-different
- Matemáticas / cerillas (evaluación aritmética)
- 9 puntos (cobertura geométrica de segmentos)
- Conteo de cuadrados (`n(n+1)(2n+1)/6` vía suma de tamaños)
- Memoria (IDs)
- Ilusiones (parcial / revisión humana)

Política: `SHORTS_HUMAN_REVIEW_POLICY`.

## Reanudación

`metadata.json` guarda fases, hashes y artefactos. `npm run short:resume -- --id <id>` salta fases `done`. Lock file `.lock` evita carreras.
