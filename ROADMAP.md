# ROADMAP — fábrica de Shorts

Fases del proyecto, dependencias y prioridades.
Estado de aprobación: `tasks/approvals.md`. Trabajo en curso: `tasks/active.md`.

## Prioridad actual

1. Estabilizar el formato **logic-lateral** (calidad visual, voz, karaoke, QC).
2. Gobernanza de agentes (este roadmap + approvals).
3. CI verde en cada cambio.
4. Solo después: nuevos formatos / publicación.

## Fases

| ID | Fase | Depende de | Prioridad | Estado |
| --- | --- | --- | --- | --- |
| P0 | Pipeline base (script → validate → voice → SRT → render → post → QC) | — | P0 | Hecho |
| P1 | Formato oficial logic-lateral (beat + visuales + CTA comentar) | P0 | P0 | Hecho |
| P2 | Validadores de acertijo + política de revisión humana | P0 | P0 | Hecho |
| P3 | Gobernanza Cursor (`AGENTS`, roadmap, tasks, rules) | — | P0 | En curso |
| P4 | CI GitHub Actions (`test` + `typecheck`) | — | P0 | En curso |
| P5 | Pulido logic-lateral (SFX, música, thumbnail, loudnorm) | P1 | P1 | Parcial |
| P6 | Más familias de plantilla (math, memory, illusion) al nivel logic-lateral | P1, P2 | P2 | Pendiente |
| P7 | Studio / preview workflow documentado y estable | P0 | P2 | Pendiente |
| P8 | Publicación YouTube (metadata, upload, schedule) | P5 | P3 | Descartado por ahora |

## Dependencias técnicas

```text
P0 ──► P1 ──► P5 ──► P8 (futuro)
 │      │
 │      └──► P6
 ├──► P2
 ├──► P3
 └──► P4
```

## Criterios para avanzar de fase

1. Criterios de `tasks/active.md` cumplidos.
2. `npm test` y `npm run typecheck` en verde.
3. Evidencia anotada en `tasks/approvals.md` (paths, comandos, capturas/vídeo si aplica).
4. Aprobación humana explícita antes de marcar la fase como **Aprobada**.

## Fuera de alcance (hasta nueva decisión)

- Motion Canvas / Anime.js como motor paralelo.
- Generación de componentes Remotion por LLM.
- Upload automático a YouTube sin gate humano.
- Cambiar el beat oficial logic-lateral sin actualizar plantilla + docs + approvals.
