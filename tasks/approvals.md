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
| P3 | Gobernanza ChatGPT+Cursor+GitHub | `accepted` | `AGENTS.md`, `ROADMAP.md`, `tasks/*`, `.cursor/rules/governance.mdc`, `.cursor/rules/shorts.mdc`, `docs/DECISIONS.md` D007–D008; informe de revisión `T-GOV-001` | humano (chat Cursor: aceptación explícita con base en informe) | 2026-10-19 |
| P4 | CI GitHub Actions | `accepted` | `.github/workflows/ci.yml`; run [39237385007](https://github.com/kguevaram94/remotion-playground/actions/runs/39237385007) en commit `fd74e44abe169808faf90132ce52960df33dd7ef` (success: `npm ci`, `npm run typecheck`, `npm test`) | humano (chat Cursor: aceptación explícita con evidencia CI) | 2026-10-19 |
| P5 | Pulido logic-lateral | `review_required` | `T-POLISH-001` implementado; ver evidencias abajo. BGM curado=0 pistas (limitación doc.) | aprobado inicio: humano 2026-10-19; aceptación pendiente | 2026-10-19 |
| P6 | Más familias plantilla | `proposed` | Depende P1/P2 + decisión de alcance | — | — |
| P7 | Studio/preview estable | `proposed` | Depende P0 | — | — |
| P8 | Publicación YouTube | `blocked` | Descartado por ahora (`ROADMAP` / D-future) | — | — |

## Tablero de tareas

| ID | Fase | Título | Estado | Notas |
| --- | --- | --- | --- | --- |
| `T-GOV-001` | P3 | Protocolo colaboración + docs gobernanza | `accepted` | Aceptado 2026-10-19 con base en el informe de revisión |
| `T-CI-001` | P4 | CI test + typecheck | `accepted` | Aceptado 2026-10-19 con evidencia CI run 39237385007 (commit `fd74e44`) |
| `T-POLISH-001` | P5 | Pulido logic-lateral (SFX, BGM curada, thumb Satori, loudnorm narración→MP4) | `review_required` | Entrega lista; espera `accepted` humano. Sin commit/push |

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

## Tarea activa / alcance aprobado

### `T-POLISH-001` · P5 · `review_required`

Estado: **`review_required`** (humano autorizó alcance 2026-10-19; implementación lista).  
Código terminado ≠ `accepted`: espera revisión humana explícita.

#### Objetivo

Elevar la calidad de producción del short **logic-lateral** de referencia en cuatro ejes acordados: SFX procedural, BGM con licencias verificables, thumbnail Satori pulido, y narración loudnorm usada en el MP4 final — **sin** cambiar el beat oficial.

#### Gates humanos (cerrados para esta propuesta)

| Gate | Decisión | Detalle operativo |
| --- | --- | --- |
| 1 · SFX | **A — Procedural** | Mantener `scripts/generate-sfx.mjs`; pulir volumen, timing y cues. Sin packs externos. |
| 2 · BGM | **B — Biblioteca curada (3–8 pistas)** | Solo pistas con licencia verificable; documentar fuente, licencia, condiciones y atribución. Excluir no verificables. Sin compra/servicios de pago sin autorización. |
| 3 · Thumbnail | **A — Pulir Satori** | Tipografía, contraste, badge y hook. Sin plantillas por familia de formato. |
| 4 · Loudnorm | **B — Narración → MP4** | Normalizar narración y que el `video.mp4` use ese audio. Sin normalización integral del mix (voz+BGM+SFX). |

#### Alcance (sí)

1. **SFX:** Ajuste de volumen/timing/cues en componentes logic-lateral + generador procedural; QC que verifique presencia de SFX esperados cuando aplique.
2. **BGM:** Curar **3–8** pistas en `songs/` (o subconjunto seleccionado por el picker); `songs/README.md` (o equivalente) con fuente/licencia/condiciones/atribución; el picker **no** elige pistas fuera del set curado; excluir del pool las no verificables (p. ej. actuales `outputXXX.mp3` sin licencia documentada).
3. **Thumbnail:** Mejoras visuales en `renderThumbnailPng` (tipografía, contraste, badge, hook); tests de smoke/regresión del PNG.
4. **Loudnorm:** Aplicar loudnorm a la narración **antes** (o de forma que el render consuma el WAV normalizado) de modo que `video.mp4` embeba esa pista; conservar original si es útil para debug; QC/report que confirme uso de audio normalizado cuando no es mock.
5. **Docs:** Actualizar `docs/generar-short.md` / `docs/tooling.md` (y `docs/DECISIONS.md` con entrada propuesta al cerrar) para reflejar política BGM + loudnorm en MP4.
6. **Tests + QC:** Unitarios/integración acotados + checks en `quality-check` para los cambios.

#### Fuera de alcance (no)

- Cambiar el beat oficial logic-lateral (`hook` → `instruction` → `countdown` → `explanation` → `reveal` → `outro` CTA).
- Nuevos formatos / familias de plantilla (P6).
- Plantillas de thumbnail por familia.
- Packs SFX externos.
- Loudnorm / master del **mix final** (voz+BGM+SFX) — queda para decisión futura.
- Publicación o upload automático a YouTube (P8).
- Servicios de pago o compra de assets sin autorización expresa.
- Dependencias npm nuevas sin justificación en el informe de revisión.
- Merge a `main`, push, o marcar `accepted` por el agente.

#### Archivos afectados previstos

| Área | Paths previstos |
| --- | --- |
| SFX | `scripts/generate-sfx.mjs`, `src/shorts/remotion/components/Sfx.tsx`, componentes que disparan cues (p. ej. `CountdownTimer`, `SwitchSequence`, `BulbStateReveal`, `LogicScene` / ramas en `ShortVideo.tsx`) |
| BGM | `src/shorts/media/bg-music.ts`, `songs/` (curación + exclusiones), `songs/README.md` (nuevo), posiblemente `tests/unit/bg-music.test.ts` |
| Thumbnail | `src/shorts/media/thumbnail.ts`, `tests/unit/thumbnail.test.ts` |
| Loudnorm | `src/shorts/media/ffmpeg.ts`, `src/shorts/pipeline/generate-voice.ts` y/o `render-video.ts` y/o `post-process.ts` (reordenar para que el render use WAV normalizado), `src/shorts/storage/job-store.ts` si hace falta metadata, `src/shorts/pipeline/quality-check.ts` |
| Docs / gobernanza | `docs/generar-short.md`, `docs/tooling.md`, `docs/DECISIONS.md` (entrada al cerrar), este archivo + `tasks/active.md` al pasar a `in_progress` |
| Tests | `tests/unit/ffmpeg.test.ts`, `tests/unit/bg-music.test.ts`, `tests/unit/thumbnail.test.ts`; ampliar o añadir según implementación |

No se tocan contratos de `HelloRemotion` ni `ScriptVideo`.

#### Dependencias

- P0–P4: `accepted`.
- Autorización humana del **alcance definitivo** (`proposed` → `approved`).
- **BGM:** disponibilidad de 3–8 pistas con licencia verificable (si ninguna de las actuales es verificable, el set curado puede quedar vacío hasta que el humano aporte pistas o autorice fuentes concretas; el pipeline debe degradar con warning, no inventar licencias).
- Voz/render de evidencia: solo si el humano autoriza uso de provider ya configurado en `.env` (sin APIs de pago nuevas).

#### Criterios de aceptación

- [ ] Beat logic-lateral intacto; sin formatos nuevos.
- [ ] SFX siguen siendo procedurales (`sfx:generate`); volumen/timing/cues pulidos en el formato de referencia; sin packs externos.
- [ ] Biblioteca BGM = 3–8 pistas **o** menos si aún no hay suficientes con licencia verificable; cada pista incluida tiene fuente/licencia/condiciones/atribución documentadas; ninguna pista no verificable entra en el picker.
- [ ] Thumbnail Satori mejora tipografía/contraste/badge/hook; sin sistema multi-plantilla por familia.
- [ ] Tras voz no-mock, existe narración normalizada y el **render del MP4** usa ese audio (no solo un sidecar post-hoc).
- [ ] Audio mock sigue etiquetado (`isTestAudio` / banner / warnings); loudnorm no se presenta como narración final en mock.
- [ ] QC/report refleja checks relevantes (BGM curada / ausencia documentada; thumbnail; audio normalizado usado en render cuando aplica).
- [ ] `npm test` y `npm run typecheck` pasan.
- [ ] Docs de uso actualizados; decisión registrada o propuesta en `docs/DECISIONS.md` al entregar.
- [ ] Entrega en `review_required`; **no** `accepted` hasta OK humano. Sin YouTube publish, sin dependencias nuevas injustificadas, sin compra de assets.

#### Pruebas previstas

```bash
npm test
npm run typecheck
```

Además (en implementación, según alcance):

- Unit: BGM picker solo ve set curado / excluye no listadas; thumbnail smoke (dimensiones/PNG); loudnorm helper o contrato “render usa WAV normalizado” (mock-friendly).
- QC: asserts/warnings nuevos cubiertos por test o por inspección de `report.json` en fixture si aplica.
- **Render de evidencia** (opcional, requiere OK humano en chat): plantilla logic-lateral con voz ya autorizada en `.env`, o mock etiquetado si solo se valida cableado; comparar que no hay banner de prueba cuando se use TTS real.

#### Riesgos y pendientes

- Origen/licencia de los MP3 actuales en `songs/` puede ser no verificable → hay que **excluirlos** del pool; P5 puede entregar política + docs + código de filtrado con 0–N pistas hasta que el humano aporte assets licenciados.
- Mover loudnorm antes del render cambia el orden de fases/artefactos; riesgo de caché de audio público en `public/shorts/` — hay que invalidar/republicar narración normalizada.
- Sin autorización de render/TTS de pago, la evidencia auditiva del loudnorm en MP4 real puede quedar limitada a mock + unit tests.
- No marcar `approved`/`accepted` el agente; espera humana explícita.

#### Condiciones generales (vinculantes)

- Beat oficial intacto · sin formatos nuevos · sin publish YouTube · sin servicios de pago no autorizados · sin deps nuevas sin justificar · tests/QC incluidos · revisión humana antes de `accepted`.

#### Estado de aprobación

`review_required` — entrega 2026-10-19. Esperando `accepted` humano.

#### Evidencias de implementación (2026-10-19)

- **Git pre-flight:** `main` limpio y sync con `origin/main` antes de implementar.
- **BGM:** `songs/catalog.json` (tracks=[]), `songs/README.md`; picker solo curadas; `output*.mp3` excluidos del pool.
- **SFX:** `scripts/generate-sfx.mjs` + `SFX_VOLUME` / cues en componentes logic-lateral; `npm run sfx:generate`.
- **Thumbnail:** `src/shorts/media/thumbnail.ts` (badge, contraste, hook).
- **Loudnorm:** `narration-loudnorm.ts`; voice + render usan WAV normalizado en MP4 (no mock).
- **QC:** checks `narrationLoudnorm`, `bgmCatalog`, `sfxProcedural`.
- **Docs:** `docs/generar-short.md`, `docs/tooling.md`, `docs/DECISIONS.md` D009.
- **Comandos:** `npm run sfx:generate` OK · `npm test` → 15 files / 50 tests passed · `npm run typecheck` OK.
- **Limitación:** 0 pistas BGM licenciadas; sin render TTS de pago en esta entrega.
- **Siguiente (proposed):** tras `accepted` P5 — P6 u otra tarea según humano. Sin commit/push/merge por el agente.
