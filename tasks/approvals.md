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
| P5 | Pulido logic-lateral | `accepted` | `T-POLISH-001` + `T-QC-LOUDNORM-001` `accepted`. BGM=0 pistas; sin validación audiovisual MP4 no-mock | humano (chat Cursor; código/tests/typecheck; limitación AV doc.) | 2026-10-19 |
| P6 | Más familias plantilla | `accepted` | A+B+C+D `accepted`. Incorporación técnica (validate/tests); no AV de todos los formatos | humano (chat Cursor: aceptación D + cierre P6) | 2026-10-19 |
| P7 | Studio/preview estable | `accepted` | `T-STUDIO-001` aceptación abajo; re-verificación 2026-10-19 (test/typecheck/studio-props); AV pendiente → propuesta `T-AV-QC-001` | humano (chat Cursor: aceptación explícita sujeta a comprobaciones) | 2026-10-19 |
| P8 | Publicación YouTube | `blocked` | Descartado por ahora (`ROADMAP` / D-future). **No** iniciado por `T-AV-QC-001` | — | — |

## Tablero de tareas

| ID | Fase | Título | Estado | Notas |
| --- | --- | --- | --- | --- |
| `T-GOV-001` | P3 | Protocolo colaboración + docs gobernanza | `accepted` | Aceptado 2026-10-19 con base en el informe de revisión |
| `T-CI-001` | P4 | CI test + typecheck | `accepted` | Aceptado 2026-10-19 con evidencia CI run 39237385007 (commit `fd74e44`) |
| `T-POLISH-001` | P5 | Pulido logic-lateral (SFX, BGM curada, thumb Satori, loudnorm narración→MP4) | `accepted` | Aceptado 2026-10-19 (código/tests/typecheck; limitación AV documentada). Sin commit/push |
| `T-QC-LOUDNORM-001` | P5 | Gate QC loudnorm + publishEligibility | `accepted` | Aceptado 2026-10-19 (auditoría final 7/7 PASS; 72 tests; typecheck OK) |
| `T-MULTIFORMAT-001` | P6 | Multiformato (entregas A–D) | A+B+C+D: `accepted` · P6: `accepted` | Cierre 2026-10-19; P8 `blocked` |
| `T-STUDIO-001` | P7 | Studio / preview workflow estable | `accepted` | Aceptado 2026-10-19; audio Studio = `public/shorts/<id>/`; AV → `T-AV-QC-001` `accepted`; P8 `blocked` |
| `T-AV-QC-001` | post-P7 / pre-P8 | Validación audiovisual real (4 familias) | `accepted` | Aceptado 2026-10-19 (chat Cursor); 4× MP4 Cedar; P8 `blocked` |
| `T-CHATTERBOX-001` | transversal post-P7 / pre-P8 | Estudio + piloto Chatterbox (fuera del pipeline) | `proposed` | Historial intacto. Nota 2026-10-21: piloto técnico MPS OK; humano aceptó la muestra. **No** `accepted`. Integración → `T-CHATTERBOX-002`. P8 `blocked` |
| `T-CHATTERBOX-002` | transversal post-P7 / pre-P8 | Integración Chatterbox (`VoiceProvider`) | fase 1: `accepted` (con reservas) · fase 2A: `accepted` (con reserva técnica) · fase 2B: `accepted` (con limitaciones) · **fase 2C: `accepted` (H1–H4)** | 2C H1–H4 `accepted` 2026-10-21 (auditoría favorable; HEAD `0774e02`). Sin inferencia real. Reservas I-R*/M-R* y reserva 2A **abiertas**; limitaciones 2B **intactas**. P8 `blocked` |
| `T-CHATTERBOX-007C-SYNC` | transversal post-P7 / pre-P8 | Sync single-take `VOICE_PROVIDER=file` (opción A) | `accepted` (con reservas) | Aceptado 2026-10-22; R1–R5 **abiertas**. Entrega `30cf3d3`; HEAD doc. `93054b9`. Piloto / opción B **no** autorizados. |

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

> Última tarea cerrada en tablero: `T-CHATTERBOX-007C-SYNC` opción A · **`accepted` (con reservas)** 2026-10-22. Hotfix SceneFade (T-007B) · **`review_required`** (abajo). Precedente `T-CHATTERBOX-002` 2C `accepted`; `T-CHATTERBOX-001` `proposed`; P8 `blocked`; P0–P7 `accepted`. Re-piloto file / opción B → requieren `approved` aparte. **R1–R5 siguen abiertas** (R3 no resuelta).

---

### `T-CHATTERBOX-007B` · hotfix SceneFade · `review_required`

#### Resumen

Corrección mínima del fallo de render Remotion del piloto file (`inputRange [0,8,9,1]` con outro de 1 frame). Implementación autorizada en chat Cursor 2026-10-22. Auditoría solo lectura 2026-10-22: veredicto técnico **APTO PARA SOLICITAR AUTORIZACIÓN DE RE-PILOTO** — ese veredicto **no** equivale a `accepted` del hotfix ni autoriza el re-piloto.

| Campo | Valor |
| --- | --- |
| Estado | `review_required` |
| Fuera de alcance | topic piloto, artefactos `output/`/`public/shorts/`, `ffmpeg.ts`/loudnorm, `.env`, re-piloto / QC real |
| R3 | **Abierta** — pendiente de re-piloto Remotion + QC reales (`approved` independiente) |

**Histórico (Git):** el hotfix SceneFade está en `1f03b70` y sincronizado (`main` = `origin/main`). Las afirmaciones «sin commit/push» eran anteriores a ese commit. Commit presente ≠ `accepted` del hotfix ≠ autorización del re-piloto.

**Pruebas (existentes; no re-ejecutadas en esta limpieza):** `npx vitest run tests/unit/scene-fade-plan.test.ts` + `npm run typecheck`.

---

### `T-CHATTERBOX-007C-SYNC` · transversal post-P7 / pre-P8 · opción A · `accepted` (con reservas)

#### Resumen

Opción A (single-take `VOICE_PROVIDER=file`) implementada y **aceptada con reservas** 2026-10-22. Ciclo: `approved` → `in_progress` → `review_required` → **`accepted` (con reservas 007C-R1…R5 abiertas)**. Piloto real y opción B permanecen `proposed` (sin autorización).

#### Aceptación humana — opción A únicamente (2026-10-22)

**Decisión humana:** aceptar opción A con reservas (intención `accepted_with_reservations`).

**Estado de gobernanza registrado:** **`accepted` (con reservas)** — el esquema oficial **no** define `accepted_with_reservations`; mismo patrón que `T-CHATTERBOX-002` fase 1 / 2A.

**Aceptado por:** humano (chat Cursor: formalización explícita 2026-10-22).

**Alcance aceptado:** contrato single-take `VOICE_PROVIDER=file` (código + tests offline + typecheck) de la entrega técnica `30cf3d3414366ab2a79d55a5714c1da6ca50d952`.

**Base de la aceptación:** evidencia de esa entrega + auditoría solo lectura 2026-10-22 (**APTO CON RESERVAS**). **No** se re-ejecutaron suites / typecheck / pipeline en el acto de aceptación.

**HEAD de la entrega técnica aceptada:** `30cf3d3` (padre `dbd86d2`).

**HEAD documental vigente al registrar:** `93054b9` (padre `30cf3d3`); dirty WT solo en `tasks/*` **sin staging**.

**Reservas abiertas (vinculantes — no resueltas):**

| ID | Riesgo residual | Seguimiento |
| --- | --- | --- |
| **007C-R1** | Sin test del borde exacto `Δ = 0,05 s` | Micro-test opcional |
| **007C-R2** | Loudnorm real / sync post-norm no auditado | Piloto file + FFmpeg (`approved` aparte) |
| **007C-R3** | QC real / duración vídeo-audio no ejercitados | Piloto + Remotion/QC (`approved` aparte) |
| **007C-R4** | Resume job real con meta antigua no probado | Resume real o doc operativa (`approved` aparte) |
| **007C-R5** | Caché = cambio de clave; sin purge de artefactos | Operativo; purge manual si hace falta |

**Explícitamente no autorizado en este acto:**

- Piloto real (`generar-short` / Remotion / loudnorm / QC).
- Opción B / forced alignment.
- Inferencia, publicación, YouTube / P8.
- Cerrar o declarar resueltas las reservas R1–R5.
- Commit / push / merge / rebase (salvo petición humana aparte).
- Alterar `T-CHATTERBOX-001` (`proposed`) u otras tareas.

#### Estado actual (Git / gobernanza)

| Campo | Valor |
| --- | --- |
| Rama | `main` |
| Base | `dbd86d27084a1692267b25cbfcd60b16ea73dda4` |
| Entrega técnica (opción A) | `30cf3d3414366ab2a79d55a5714c1da6ca50d952` (padre `dbd86d2`) |
| HEAD documental vigente | `93054b9ab6eeb7440007386f1cbcd65bef682072` (padre `30cf3d3`) |
| Sincronización remota | `main` = `origin/main` (0 ahead / 0 behind); dirty local solo en `tasks/*` **sin staging** |
| Working tree | registro de aceptación documental **sin staging** |
| Topic piloto | `data/topics/t007b-file-pilot.json` versionado en la entrega técnica |
| WAV ref. | `/tmp/t007a-narration-concat.wav` (SHA-256 `13f80d920828554b506e543003adf98fa3a0d6b47162ee5fc369915d60a7a4c2`) |
| Gobernanza | `accepted` opción A **≠** autorización de piloto / opción B / Remotion / loudnorm-QC reales / inferencia / publicación |

**Histórico (antes de `93054b9`):** se afirmó «topic untracked» / «sin commit/push» respecto de la entrega. Eso describía el estado anterior a `93054b9` / a la entrega `30cf3d3`, no el estado versionado de opción A.

#### Auditoría solo lectura (2026-10-22)

Veredicto **APTO CON RESERVAS** (sin re-ejecución de tests en auditoría ni en el acto de aceptación). Reservas: **007C-R1**…**R5** (abiertas; detalle en `tasks/active.md` y tabla de aceptación arriba).

#### Fase correctiva de gobernanza (histórico pre-aceptación)

Reconciliación documental `tasks/active.md` + este archivo con el repo real. Sin código/tests/`.env`/topic/WAV; sin pipeline/Remotion/FFmpeg/loudnorm/QC/inferencia. Superseded por la aceptación humana arriba.

---

### `T-CHATTERBOX-002` · transversal post-P7 / pre-P8 · fase 1 `accepted` (con reservas) · fase 2A `accepted` (con reserva técnica) · fase 2B `accepted` (con limitaciones) · fase 2C `accepted` (H1–H4)

#### Resumen

Fase 1 (CLI Python + docs + pins + tests aislados) implementada, remediada (B1–B2, I1–I6, M1–M8) y **aceptada con reservas** por humano (2026-10-21). Smoke test real del CLI (mismo día) registrado abajo.  
**Fase 2A** (provider Node + factory + env + corrección anti-reuso + tests mock spawn) autorizada, implementada y **aceptada con reserva técnica** por humano (2026-10-21).  
**Fase 2B** (identidad de caché: SHA-256 ref + huella pins declarados + params; correcciones auditoría **#4** / **#9**) autorizada, implementada y **aceptada con limitaciones** por humano (2026-10-21).  
**Fase 2C** (pipeline mínimo H1–H4: preflight + integración offline + docs + verificación) — **`approved`** → **`in_progress`** → **`review_required`** → **`accepted`** (2026-10-21; auditoría favorable H1–H4). **Sin** inferencia real en este alcance.

#### Aprobación humana — fase 2C alcance H1–H4 únicamente (2026-10-21)

**Decisión humana:** aprobar inicio del alcance mínimo de fase 2C (H1–H4).  
**Estado de gobernanza registrado (ciclo completo):** **`approved`** → **`in_progress`** → **`review_required`** → **`accepted`** (ver sección de aceptación abajo).  
**Aprobado por:** humano (chat Cursor: solicitud explícita de aprobación de alcance tras auditoría de preparación solo lectura; luego autorización expresa de implementación H1–H4).  
**Alcance aprobado:**

| Hito | Contenido |
| --- | --- |
| **H1** | Preflight: corregir validación temprana en `src/shorts/pipeline/run.ts`; tests config Chatterbox válida/incompleta; fallo explícito sin degradar a mock |
| **H2** | Integración offline: provider Chatterbox simulado + normalización controlada + QC por fixtures; multisegmento; fallo de segmento; sin artefactos de éxito incorrectos; semántica loudnorm/`publishEligibility` intacta |
| **H3** | Documentación: flujo de voz; coste de carga por segmento; limitaciones de trazabilidad; distinguir `verified_provenance` (QC loudnorm P5) de procedencia modelo/checkpoints/ref vocal |
| **H4** | Verificación: `npm test` + `npm run typecheck`; diffs/evidencias para revisión humana (`review_required`) |

**Explícitamente fuera de esta aprobación:**

- Inferencia real; descargas de modelos.
- Cerrar reservas fase 1 (I-R1–I-R4, M-R1–M-R5), reserva técnica 2A, o limitaciones 2B.
- Declarar procedencia de modelo / ref / checkpoints como verificada.
- Modificar P8, publicación, YouTube, umbrales QC, o providers ajenos al alcance.
- Commit / push / merge / rebase.
- Job real con pesos (requiere **nuevo** `approved` humano independiente).

**Discrepancias con el plan de preparación:** ninguna bloqueante. El plan de preparación proponía inferencia real como hito opcional separado; esta aprobación **excluye** inferencia y numera docs como H3 y verificación como H4 — alineado con la recomendación de 2C mínimo.

#### Entrega agente — fase 2C H1–H4 (histórico `review_required` → `accepted`, 2026-10-21)

**HEAD auditado (entrega H1–H4):** `0774e0211bc03f25b98b57bc7d12800e1b5e03bd`  
**Padre del HEAD:** `49321b93bfb811b4c7887c0e0eb10a27f2576779` (commit de gobernanza de aprobación 2C / base previa a la entrega).  
**Corrección documental:** no afirmar que la entrega finalizó en `49321b9` «sin commit»; la entrega H1–H4 quedó versionada en `0774e02`.

**Implementado:**

| Hito | Cambio |
| --- | --- |
| **H1** | `run.ts`: `needsVoice` ya no se AND-ea con `openai-tts`. `env.ts`: ElevenLabs exige también `ELEVENLABS_VOICE_ID`. Tests: `tests/unit/pipeline-voice-preflight.test.ts` |
| **H2** | `tests/integration/chatterbox-voice-qc-offline.test.ts` — stub Chatterbox PCM16 24 kHz + stub `loudnormAudio` + `runGenerateVoice` / `runQualityCheck` reales; multisegmento; fallo mid-segment; caché; QC/`publishEligibility`. Render MP4 **simulado** |
| **H3** | `docs/voice.md`, `docs/generar-short.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` (D017) |
| **H4** | Suites dirigidas 83 passed; `npm test` 26 files / **158 passed**; `npm run typecheck` OK |

**Confirmaciones:** sin inferencia Chatterbox real; sin descargas de modelos; umbrales QC / `publishEligibility` intactos; reservas I-R*/M-R*, reserva 2A, limitaciones 2B **abiertas**; `verified_provenance` solo = loudnorm P5.

##### Aceptación humana — fase 2C únicamente (H1–H4, 2026-10-21)

**Decisión humana:** aceptación de fase 2C (alcance H1–H4) tras auditoría favorable.  
**Estado de gobernanza registrado:** **`accepted`** (fase 2C · H1–H4).  
**Aceptado por:** humano (chat Cursor: formalización explícita de aceptación de fase 2C tras auditoría favorable H1–H4).  
**Alcance aceptado:** únicamente H1–H4 — preflight, integración offline stub/fixtures, documentación de flujo/coste/trazabilidad, y verificación `npm test` / `typecheck`.  
**HEAD de la entrega aceptada:** `0774e0211bc03f25b98b57bc7d12800e1b5e03bd` (padre `49321b93bfb811b4c7887c0e0eb10a27f2576779`).

**Base de la aceptación:**

- Auditoría favorable de H1–H4 (preflight, offline stub/fixtures, docs, verificación).
- Entrega versionada en `0774e02` (no en `49321b9` sin commit).
- Sin inferencia real ni descargas de modelos en el alcance aceptado.
- Umbrales QC / `publishEligibility` / orden voice→loudnorm→render→post intactos.
- Reservas fase 1 (I-R*/M-R*), reserva técnica 2A y limitaciones 2B **permanecen abiertas** — la aceptación de 2C **no** las cierra ni reclasifica.

**Explícitamente no autorizado en este acto:**

- Inferencia real; descargas de modelos; install; daemon.
- Cerrar o declarar resueltas las reservas 1 / 2A / limitaciones 2B.
- Declarar procedencia de modelo / ref / checkpoints / venv como verificada.
- P8 / YouTube / publicación; cambiar umbrales QC o `publishEligibility`.
- Commit / push / merge / rebase (salvo petición humana aparte).
- Job real con pesos (requiere **nuevo** `approved` humano independiente).

**Siguiente:** inferencia real / job con pesos permanece **`proposed`** hasta nuevo `approved`. P8 permanece **`blocked`**. Sin alcance de implementación autorizado tras este acto.

#### Aceptación humana — fase 1 únicamente (2026-10-21)

Estado de **fase 1:** **`accepted` (con reservas)**.  
Estado de **fase 2:** **no autorizada** (sigue pendiente de decisión humana).  
Estado de la tarea en tablero: compuesto (fase 1 aceptada acotada · fase 2 no autorizada) — **no** implica cierre completo de `T-CHATTERBOX-002`.

**Elección de estado:** el esquema oficial (`proposed` \| `approved` \| `in_progress` \| `review_required` \| `accepted` \| `blocked`) **no** define `accepted_with_reservations`. Se usa el equivalente ya establecido en el proyecto: **`accepted` + limitaciones/reservas explícitas y vinculantes** (mismo patrón que P5/P7 con limitaciones documentadas). No se inventó un estado nuevo incompatible.

**Aceptado por:** humano (chat Cursor: aceptación acotada de fase 1 CLI aislado, docs, pins y tests sintéticos).  
**Alcance aceptado:** únicamente fase 1 remediada bajo `tools/chatterbox/` + gobernanza asociada.  
**Explícito en el acto de aceptación:** **no** se había realizado inferencia real durante la remediación ni en ese registro de aceptación (el smoke posterior es un acto separado, abajo).

**Reservas vigentes (abiertas — no son verificaciones superadas):**

| ID | Hallazgo | Tipo | Notas de trazabilidad |
| --- | --- | --- | --- |
| **I-R1** | WAV huérfano si falla `--meta-out` tras WAV OK | importante | Sin transacción WAV+meta; exit 1 pero el WAV puede permanecer |
| **I-R2** | Parche MPS más ancho que “solo carga” | importante | Context manager cubre generate+write; smoke MPS OK no cierra el hallazgo de alcance del parche |
| **I-R3** | Meta `weights_only` / `mps_patch` mezclan piloto con runtime | importante | Claims de corrida ≠ hechos solo de esta ejecución |
| **I-R4** | Cleanup de temp ante fallo post-escritura casi sin test | importante | Gap de cobertura sintética |
| **M-R1** | Sin test dedicado `--meta-out == --ref` | menor | Código presente; test solo `output==ref` |
| **M-R2** | Sin test symlink / permisos / destino=directorio | menor | Preflight presente; permisos = manual |
| **M-R3** | Sin `peak_abs_after` explícito | menor | Tras clamp implícito ≤1 |
| **M-R4** | Rangos 0–1 / temp≤2 documentados, no medidos vs modelo real | menor | Smoke usó defaults; no midió límites del modelo |
| **M-R5** | Tipado `preflight` → `dict[str, Path]` con `meta: None` | menor | Estático |

**Pruebas manuales (estado tras smoke 2026-10-21):**

- [x] Checkpoints requeridos del pack es-es: carga real ejercitada en smoke (ve / t3_es_es / s3gen_v3 / grapheme) — **no** implica cierre de reservas I-R*/M-R*
- [x] MPS real: `device_requested=mps`, `device_used=mps`, sin fallback a CPU
- [ ] Compatibilidad real de `conds.pt` — **archivo ausente** en el smoke; `Conditionals.load` **no** ejercitado / **no** validado
- [ ] Watermark Perth — política documentada `left_intact`; **sin** auditoría del watermark

**No autorizado en el acto de aceptación ni en el registro de smoke (histórico):** fase 2 completa; caché / pipeline / QC / elegibilidad; modificar código CLI; commit/push/merge; P8; YouTube; APIs de pago; daemon; copiar ref/WAV al repo.  
**Autorización posterior (2026-10-21):** solo **fase 2A** (provider Node + factory + config + tests deterministas). Ver sección fase 2A abajo.

#### Fase 2A — provider Node / factory / config (`accepted` con reserva técnica, 2026-10-21)

**Autorizado por:** humano (chat Cursor: alcance explícito solo 2A).  
**Estado de implementación (histórico):** `approved` (autorización en chat) → `in_progress` → `review_required`.  
**Estado de aceptación (acto humano):** **`accepted` (con reserva técnica)** — ver sección de aceptación abajo.  
El esquema oficial **no** define `accepted_with_reservation`; se registra **`accepted` + reserva técnica vinculante** (mismo patrón que fase 1).

**Implementado (agente):**

| Pieza | Path / nota |
| --- | --- |
| Provider | `src/shorts/voice/chatterbox.ts` — spawn argv-safe, timeout 300000, WAV PCM16 mono 24 kHz + meta de esta ejecución; anti-reuso por `exists`/`size`/`mtimeMs` |
| Factory | `src/shorts/voice/provider.ts` — `case 'chatterbox'`; default y demás providers intactos; config inválida → throw (no mock) |
| Config | `src/shorts/config/env.ts` — `CHATTERBOX_*`; placeholders `.env.example`; nota `docs/voice.md` |
| Tests | `tests/unit/voice-chatterbox.test.ts` — spawn simulado; sin red/pesos/inferencia |

**Comandos ejecutados (agente, entrega inicial):**

```bash
npm test -- tests/unit/voice-chatterbox.test.ts tests/unit/voice.test.ts  # 18 passed
npm test          # 22 files / 119 passed
npm run typecheck # OK
```

**Confirmaciones (entrega):** sin descargas HF; sin inferencia real; sin cambios pipeline/caché/QC/CI; sin commit/push/merge en el acto de implementación; CLI Python no modificado; reservas I-R*/M-R* de fase 1 siguen abiertas; I-R1 respetada (WAV sin meta ≠ éxito).

##### Aceptación humana — fase 2A únicamente (2026-10-21)

**Decisión humana:** `accepted_with_reservation` (intención).  
**Estado de gobernanza registrado:** **`accepted` (con reserva técnica)** — el esquema no admite `accepted_with_reservation`.  
**Aceptado por:** humano (chat Cursor: aceptación explícita de fase 2A con reserva técnica documentada).  
**Alcance aceptado:** fase 2A exclusivamente — provider Node.js, factoría, configuración y corrección anti-reuso asociada.  
**Fases 2B y 2C:** **no autorizadas**.

**Base de la aceptación (revisión final comunicada por el humano):**

- 21 pruebas específicas superadas.
- `npm run typecheck` correcto.
- Diff correctivo limitado a `src/shorts/voice/chatterbox.ts` y `tests/unit/voice-chatterbox.test.ts`.
- Sin cambios declarados en la caché, el pipeline, QC, CI, CLI Python ni otros providers.
- Sin inferencia real ni descargas de modelos durante las pruebas.
- Sin commits ni otras operaciones de integración en el acto de aceptación.
- La suite completa **no** se ejecutó durante la revisión final y **no** se registra como verificada en esta última comprobación.

**Reserva técnica obligatoria (abierta — vinculante):**

La comprobación basada en `exists`, `size` y `mtimeMs` proporciona una detección práctica de artefactos que no parecen haberse actualizado, pero **no demuestra criptográficamente** que el contenido del WAV o de los metadatos pertenezca a la ejecución actual.

Limitaciones reconocidas:

- Una reescritura puede conservar el mismo tamaño y una marca de modificación equivalente.
- Otro proceso podría modificar los atributos del archivo sin garantizar que su contenido corresponda a la síntesis actual.
- La solución **no** equivale a una vinculación por nonce, identificador de ejecución o hash de contenido.

Esta limitación se acepta como reserva explícita de la fase 2A. **No** debe describirse el resultado como una garantía criptográfica de identidad de audio.

**Reservas de fase 1:** permanecen abiertas todas las I-R* y M-R* previamente documentadas (incl. `conds.pt`, Perth, atomicidad conjunta WAV+meta, límites de cobertura de pruebas). La aceptación de 2A **no** las cierra ni modifica, y **no** constituye declaración de procedencia verificada.

**Restricciones vigentes en el acto de aceptación de 2A (histórico):**

- No iniciar 2B/2C **en ese acto** (2B recibió `approved` humano posterior — ver sección 2B; **2C sigue sin autorización**).
- No modificar caché/hashes **en ese acto de aceptación**.
- No modificar QC/render/post/CI/publicación; no inferencia/descargas; no commit/push/merge/rebase en el registro de aceptación.

**Fuera de 2A (histórico al aceptar 2A):** 2B caché/hashes; 2C; pipeline; loudnorm/render/post/QC; elegibilidad; daemon.  
**Nota:** 2B fue autorizada e implementada después (sección fase 2B abajo). **2C sigue sin autorización.**

#### Fase 2B — identidad de caché / runtime pin declarado (`accepted` con limitaciones, 2026-10-21)

**Autorizado por:** humano (chat Cursor: alcance explícito solo 2B).  
**Estado de implementación (histórico):** `approved` (autorización en chat) → `in_progress` → `review_required` (incl. correcciones #4/#9).  
**Estado de aceptación (acto humano):** **`accepted` (con limitaciones)** — ver sección de aceptación abajo.  
El esquema oficial **no** define `accepted_with_reservation`; se registra **`accepted` + limitaciones explícitas y vinculantes** (mismo patrón que fase 1 / 2A).

**Implementado (agente):**

| Pieza | Path / nota |
| --- | --- |
| Helpers | `src/shorts/voice/chatterbox-cache.ts` — SHA-256 streaming de ref; parse/normalización/`runtimePinSha256` de `requirements-pin.txt`; identidad `2b\|…` |
| Pipeline | `src/shorts/pipeline/generate-voice.ts` — solo si `voiceProvider === 'chatterbox'`; otros providers sin cambio de clave |
| Docs | `docs/voice.md` — nota 2B + límites (pins declarados ≠ venv instalado) + parseo estricto |
| Tests | `tests/unit/voice-chatterbox-cache.test.ts` — fixtures sintéticas; sin red/pesos/inferencia |
| Tests cableado | `tests/unit/generate-voice-chatterbox-cache.test.ts` — ejercita `runGenerateVoice` (stub synthesize; sin inferencia) |

**Esquema de identidad Chatterbox (`model` → `narrationCacheKey`):**

```text
2b|modelId=…|refSha256=<hex>|runtimePinSha256=<hex>|device=…|lang=…|exag=0.500000|cfg=0.500000|temp=0.800000
```

- `refSha256`: SHA-256 de **bytes** de la ref (chunked); no ruta/mtime.
- `runtimePinSha256`: SHA-256 UTF-8 de JSON canónico `{python?, packages:{…}}` parseado de `requirements-pin.txt` junto al CLI (`name==version` + comentario `# Python interpreter:`).
- Parseo estricto (corrección auditoría **#4**): comentarios/líneas vacías ignorados; líneas malformadas y paquetes duplicados → **throw** (sin huella parcial).
- Fallo explícito si falta ref o pins / pins vacíos / pins inválidos → **no** reuso silencioso de caché.
- Version prefix `2b` para migraciones futuras de serialización.

**Correcciones auditoría 2B (2026-10-21, chat Cursor — solo #4 y #9; cerradas en aceptación):**

| Hallazgo | Remedio | Estado |
| --- | --- | --- |
| **#4** | `parseRequirementsPinText` fail-loud en malformadas/duplicados + tests | **cerrado** |
| **#9** | Test de integración del cableado vía `runGenerateVoice` (mock synthesize) | **cerrado** |

**Entrega revisada:** commit `c119717d38427e0ff04469d5696024a0ad422d58` (HEAD al acto de aceptación).

**Límites explícitos (no cerrados por 2B — vinculantes):**

- Pins = **declarados en repo**; **no** se consulta el intérprete ni paquetes instalados.
- **No** hash de checkpoints bajo `CHATTERBOX_CKPT_DIR`.
- Hash de ref distingue entradas de caché; **no** prueba que el audio final proceda de esa ref.
- **No** `verified_provenance`; reservas I-R*/M-R* y reserva técnica 2A **siguen abiertas**.

**Comandos ejecutados (agente — correcciones #4/#9, 2026-10-21) y re-verificados en auditoría final:**

```bash
npm test -- tests/unit/voice-chatterbox-cache.test.ts tests/unit/generate-voice-chatterbox-cache.test.ts tests/unit/voice-chatterbox.test.ts tests/unit/voice.test.ts
# Test Files  4 passed · Tests  40 passed

npm test
# Test Files  24 passed · Tests  141 passed

npm run typecheck
# OK (tsc --noEmit)
```

**Confirmaciones (entrega / auditoría):** sin descargas HF; sin inferencia real; sin muestra vocal personal; sin cambios QC/CI/CLI Python/`chatterbox.ts`/anti-reuso 2A; fase 2A aceptación + reserva técnica intactas; reservas I-R*/M-R* abiertas; 2C no iniciada.

**Fuera de 2B (no autorizado / no iniciado):** 2C; pipeline render/post; loudnorm/QC; elegibilidad; daemon; verificación live del venv.

##### Aceptación humana — fase 2B únicamente (2026-10-21)

**Decisión humana:** aceptación acotada de fase 2B tras auditoría final (hallazgos #4/#9 PASS; 141 tests; typecheck OK).  
**Estado de gobernanza registrado:** **`accepted` (con limitaciones)** — el esquema no admite `accepted_with_reservation`.  
**Aceptado por:** humano (chat Cursor: formalización explícita de aceptación de fase 2B).  
**Alcance aceptado:** fase 2B exclusivamente — identidad de caché Chatterbox (SHA-256 ref + huella pins declarados + params), parseo estricto de pins, cableado en `generate-voice`, tests unitarios + de cableado, docs mínimas.  
**Fase 2C (histórico al aceptar 2B):** no autorizada en ese acto.  
**Actualización 2026-10-21:** fase 2C pasó a **`approved`** → implementada → **`accepted`** (alcance H1–H4; auditoría favorable) — ver secciones 2C arriba.

**Base de la aceptación:**

- Auditoría final independiente: comprobaciones #1–#8 PASS (o evidencias reejecutadas); recomendación `apta para aceptación humana`.
- Hallazgos de auditoría **#4** (pins estrictos) y **#9** (test cableado `runGenerateVoice`) **cerrados**.
- `npm test` — 24 files / **141** tests passed; `npm run typecheck` OK.
- Diff correctivo acotado a entrega `c119717` (helpers/tests/docs/gobernanza); sin ampliar a 2A/CLI Python/QC/CI/2C.
- Sin inferencia real ni descargas de modelos en la verificación de aceptación.
- Sin commits / push / merge / rebase en este acto de formalización de gobernanza.

**Limitaciones obligatorias de la aceptación 2B (abiertas — vinculantes):**

1. Pins declarados en `requirements-pin.txt` **≠** prueba de paquetes instalados en el venv.
2. Sin hash de checkpoints / manifiesto de pesos en disco.
3. `refSha256` distingue entradas de caché; **no** prueba procedencia del audio final.
4. **No** se declara `verified_provenance`.

**Reservas de fase 1:** permanecen abiertas todas las I-R* y M-R* previamente documentadas.  
**Reserva técnica de fase 2A:** permanece abierta (`exists`/`size`/`mtimeMs` ≠ garantía criptográfica).  
La aceptación de 2B **no** las cierra ni modifica. La aprobación de 2C **tampoco** las cierra.

**Siguiente tras 2B (histórico):** 2C en `proposed`. **Estado actual:** 2C `accepted` (H1–H4; 2026-10-21) — ver sección arriba.

#### Evidencia — smoke test real CLI (2026-10-21, macOS Apple Silicon)

**Autorización:** humano (chat Cursor) — inspección + **una** inferencia controlada del CLI `tools/chatterbox/synthesize.py` únicamente. **No** fase 2. **No** cambios de código. **No** instalar/actualizar deps. **No** descargar pesos. **No** `--force`. Artefactos y ref vocal **fuera** de Git (sin rutas personales en este registro).

| Hecho observado | Valor |
| --- | --- |
| Stack | Python **3.11.17**, PyTorch **2.6.0**, torchaudio **2.6.0**, chatterbox-tts **0.1.7** |
| Dispositivo | MPS disponible y **utilizado** (`device_used=mps`); sin fallback a CPU |
| Resultado | Inferencia real completada; **exit code 0** |
| Audio | WAV **PCM16 mono 24 kHz**; duración **3,68 s** |
| Tiempos | `load_seconds≈18.6`; `generate_seconds≈25.0` |
| Clamp | `peak_abs_before≈1.08`; **64** muestras clampadas |
| `s3gen_missing_keys` | `tokenizer._mel_filters`, `tokenizer.window` (esperado vs 0.1.7) |
| Referencia vocal | Intacta (comprobación de tamaño y mtime; sin contenido biométrico en repo) |
| Instalaciones / descargas | **Ninguna** en la corrida |
| `conds.pt` | **No presente**; carga de conditionals **sigue sin verificarse** |
| Perth | Meta `perth_watermark: "left_intact"`; **sin** auditoría del watermark |

**Límites explícitos de esta evidencia:** no valida `conds.pt`, no audita Perth, no valida integración Node/pipeline, **no** autoriza ni inicia fase 2, **no** cierra reservas I-R1–I-R4 / M-R1–M-R5.

#### Historial — remediación fase 1 (2026-10-21) — evidencias (conservadas)

Ciclo previo: remediación autorizada → `in_progress` → `review_required` → **aceptación acotada arriba**.

| Hallazgo | Estado | Notas |
| --- | --- | --- |
| B1 protección archivos | corregido | `--force`; nunca sobre `--ref`; atomic replace; tests integridad |
| B2 NaN/±Inf | corregido | fail-fast antes de pico/PCM16; tests NaN/+Inf/-Inf |
| I1 parche `torch.load` | corregido | context manager + solo `device=mps`; restore sintético sin torch |
| I2 `weights_only` / checkpoints | corregido (docs) | README hecho vs hipótesis; `conds.pt` pendiente manual |
| I3 integridad WAV | corregido | ≥1 sample; duración >0; RIFF/WAVE; tests |
| I4 CLI | corregido | rangos finitos; preflight paths; exit codes documentados |
| I5 README tests | corregido | solo `cd tools/chatterbox && python3.11 -m unittest …` |
| I6 cobertura tests | corregido | ampliada; límites de inferencia explícitos |
| M1–M8 | corregido / doc | ver informe de revisión del agente |

**Prueba local (sin torch/pesos/inferencia):** `cd tools/chatterbox && python3.11 -m unittest test_synthesize -v`  
**Nota vinculante (suite):** esa suite **no** valida inferencia real, checkpoints, `conds.pt`, MPS real ni Perth.  
**Nota (smoke posterior):** la inferencia MPS del 2026-10-21 (sección evidencia arriba) **sí** ejercitó carga de pesos requeridos + device MPS; **sigue sin** validar `conds.pt`, auditoría Perth ni Node/pipeline.

#### Estado de aprobación (histórico pre-aceptación)

`review_required` — 2026-10-21 (agente, tras remediación).  
Autorización humana de remediación **exclusiva** de fase 1 (2026-10-21). En ese momento: **No** `accepted`. **No** fase 2.  
Superseded por la aceptación acotada de fase 1 (sección anterior).

**Diseño condicional original (integración futura)** — conservado:

#### Nota de continuidad respecto a `T-CHATTERBOX-001`

- Historial y estado oficial de **001** se conservan (`proposed`); **no** se marca `accepted` en este acto.
- Registro separado (hecho humano, 2026-10-21): piloto técnico fuera del repo generó audio en **MPS**; el usuario **aceptó la muestra** para el uso previsto.
- Stack medido en piloto (no afirmar compatibilidad general): Python **3.11.17**, torch/torchaudio **2.6.0**, `chatterbox-tts==0.1.7`, modelo `ResembleAI/Chatterbox-Multilingual-es-es`, loader custom es-es con `strict=False` + parche MPS `torch.load`/`map_location`.
- WAV piloto: IEEE Float32, picos abs ≈ 1.12 (≈0,06 % muestras >1) → la integración exige clamp + PCM S16LE 24 kHz mono antes de concat/loudnorm.

#### Requisitos condicionados (vinculantes para una futura implementación)

1. **Caché:** SHA-256 del **contenido** de la ref vocal + identificación reproducible de modelo (manifiesto de pesos) + runtime pin; no depender solo de mtime/size.
2. **CLI:** validar WAV (formato/dims); tratar Float32 >1,0 con hard clamp → PCM16; meta con `peak_abs_before` / `samples_clamped`.
3. **Procedencia:** sin debilitar `verified_provenance` ni cambiar elegibilidad QC; render sigue ligado al WAV loudnorm exacto (`render-narration.json` + sha1).
4. **Versiones:** fijar solo las probadas (arriba); documentar loader custom / `strict=False` / parche MPS.
5. **Segmentos/pausas:** documentar coste ≈ N×(load+gen) por cold start; **sin** daemon ni cambio de segmentación sin decisión explícita. Timeout dedicado (`CHATTERBOX_TIMEOUT_MS`, sugerido ≥300000).
6. **Paths:** sin rutas absolutas personales en código versionado; `.env` local → runtime/pesos fuera de Git.
7. **Ignore:** proteger `data/voices/*.wav`, venvs, cachés HF, pesos; **no** borrar artefactos locales existentes.
8. Piloto / pesos / ref permanecen fuera del tree de Git.

#### Archivos previstos (solo tras `approved` de implementación)

| Área | Paths |
| --- | --- |
| CLI Python | `tools/chatterbox/synthesize.py`, README, pins documentados |
| Provider | `src/shorts/voice/chatterbox.ts`, `provider.ts`, `config/env.ts` |
| Pipeline | `generate-voice.ts` (cache key SHA-256 + runtime pin) |
| Docs / env | `.env.example` (placeholders), `docs/voice.md`, `ARCHITECTURE.md`, `DECISIONS.md` |
| Ignore / tests | `.gitignore`, `tests/unit/voice*.test.ts` (spawn mock; sin pesos en CI) |

**No tocar en implementación:** beats, plantillas, gate QC loudnorm, orden voice→loudnorm→render→post, `HelloRemotion` / `ScriptVideo`, P8.

#### Criterios de aceptación (implementación futura)

- [ ] CLI → PCM16 24 kHz mono; clamp documentado; fallos ≠ mock.
- [ ] Caché con SHA-256 ref + manifiesto/runtime pin.
- [ ] Job de prueba: loudnorm + `verified_provenance`; elegibilidad sin cambio de criterio.
- [ ] Docs de stack pinneado + coste por segmento; sin daemon.
- [ ] Sin paths personales en tree; gitignore; sin muestras/pesos en Git.
- [ ] `npm test` + `typecheck`; providers actuales sin regresión.

#### Recomendación (tras aceptación 2C H1–H4 → `accepted`)

1. Fase 1 permanece **`accepted` con reservas** (I-R1–I-R4, M-R1–M-R5 **abiertas**). Smoke MPS exit 0 documentado; **no** cierra reservas.
2. Fase 2A permanece **`accepted` con reserva técnica** (`exists`/`size`/`mtimeMs` ≠ garantía criptográfica) — **abierta**.
3. Fase 2B **`accepted` con limitaciones** (2026-10-21); #4/#9 cerrados. **No** `verified_provenance` de modelo/ref vía caché.
4. Fase 2C **`accepted`** (H1–H4; 2026-10-21; auditoría favorable; HEAD `0774e02`). **Sin** inferencia real en el alcance aceptado.
5. Conservar OpenAI / file / ElevenLabs / macos-say / mock; Chatterbox solo con config explícita válida.
6. Pendientes manuales aún abiertos: **`conds.pt`**, auditoría **Perth**. No afirmarlos como superados. Pins declarados ≠ venv instalado.
7. Inferencia real / job con pesos: **`proposed`**; requiere nuevo `approved` humano. P8 permanece **`blocked`**. Sin alcance de implementación autorizado.

---

### `T-CHATTERBOX-001` · transversal post-P7 / pre-P8 · `proposed`

#### Resumen

Estudiar Chatterbox como proveedor local de voz (clonación con muestra propia) para Shorts, sin tocar Remotion ni el contrato loudnorm/QC aceptado. Esta entrega es **solo propuesta**.

#### Estado de aprobación

`proposed` — 2026-10-21 (agente, chat Cursor). Historial **conservado**; **no** pasado a `accepted` en el registro de 002.

##### Nota posterior (2026-10-21) — piloto / muestra (sin cerrar la tarea)

Registro **separado** del estado oficial (sigue `proposed`):

- Piloto técnico fuera de Git: generación OK en Apple Silicon vía **MPS** (métricas en entorno piloto local).
- Humano (chat Cursor): escuchó el resultado y **aceptó la muestra** para el uso previsto.
- La planificación de integración continúa en **`T-CHATTERBOX-002`** (`proposed`); 001 no se marca `accepted` sin autorización expresa.

**No autorizado (001):** marcar `accepted` automáticamente; integrar pipeline; commit/push/merge; P8; publicar; APIs de pago.

#### Diagnóstico Git (2026-10-21)

| Campo | Valor |
| --- | --- |
| Branch | `main` sync con `origin/main` |
| Working tree | limpio |
| HEAD | `5e9ce16` (aceptación `T-AV-QC-001`) |
| Cambios ajenos | ninguno a sobrescribir |

#### 1. Diagnóstico del sistema de voz actual

| Pieza | Hecho verificado en repo |
| --- | --- |
| Interfaz | `VoiceProvider` en `src/shorts/voice/provider.ts`: `synthesize(text, outputPath, ctx?) → VoiceResult` |
| Factory | `createVoiceProvider(config)`: `mock` \| `macos-say` \| `openai-tts` \| `elevenlabs` \| `file` |
| Config | `VoiceProviderName` + env en `src/shorts/config/env.ts`; `.env.example` documenta los cinco |
| Pipeline | `runGenerateVoice` → `narration.wav` + `voice-meta.json` → loudnorm (no mock) → subtítulos → render usa WAV normalizado → post **no** crea loudnorm → QC por provenance |
| Caché | `narrationCacheKey(text+pausas, provider, model|name|speed|instructions|…)` evita regenerar si hash coincide |
| Mock | `isTestAudio=true`, banner, loudnorm omitido, nunca `eligible` |
| Procedencia | `render-narration.json` / `NarrationRenderKind`: `loudnorm` \| `raw` \| `mock`; QC `verified_provenance` |
| Sample rates | macOS→WAV 22050; OpenAI/concat documentados a 24 kHz; `concatWavFiles` **no** resamplea |
| Tests | `tests/unit/voice.test.ts` solo cubre `MockVoiceProvider` |
| Docs | `docs/voice.md`, `docs/openai-tts.md`, `docs/ARCHITECTURE.md` |
| Muestra propia hoy | `VOICE_PROVIDER=file` o ElevenLabs clone (`data/voices/me.wav` documentado; **no** gitignored aún salvo `output/voice-samples/`) |

Flujo de referencia (intacto):  
`generating_voice` → `ensureNarrationLoudnorm` → `generating_subtitles` (cues de `voice-meta`) → `rendering` (`selectNarrationSourceForRender` + publish) → `post_process` → `quality_check`.

#### 2. Compatibilidad y requisitos Chatterbox

Fuente principal: [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox) + card HF [`ResembleAI/Chatterbox-Multilingual-es-es`](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-es-es).

##### Hechos confirmados (documentación upstream)

| Tema | Hecho |
| --- | --- |
| Software | Repo MIT; card `es-es` también `license: mit` |
| Multilingual V3 | ~500M; 23+ idiomas incl. `es`; API `ChatterboxMultilingualTTS.from_pretrained(..., t3_model="v3")` |
| Single Language Pack | Finetune España: `ResembleAI/Chatterbox-Multilingual-es-es` (locale `es-ES`, language_id `es`); pesos T3 ~2.14 GB + S3Gen ~1.06 GB |
| Clonación | `audio_prompt_path` / referencia WAV en `generate(...)` |
| Sample rate salida | `S3GEN_SR = 24000` (compatible con concat OpenAI del repo) |
| Python | Desarrollado/probado en **Python 3.11** (Debian); `pip install chatterbox-tts` |
| Device API | Docs admiten `"cuda"` / `"cpu"` / `"mps"` |
| Watermark | Perth implícito en **todo** audio generado |
| Turbo/Nano | Solo inglés; **no** aptos como sustituto es-ES de producción |

##### Hipótesis / pendientes de medir en este Mac

| Tema | Estado |
| --- | --- |
| MPS estable en Multilingual V3 / `es-es` | Comunidad: hace falta parche `torch.load` `map_location` (`example_for_mac.py`); issues de install Apple Silicon (#336, #275). **No ejecutado aquí.** |
| RAM / tiempo cold-start / RTF | No medido; comunidad ~5–6 GB VRAM en NVIDIA para 500M — en Apple Silicon es unificado, cifra local desconocida |
| Calidad es-ES + acento andaluz con *tu* referencia | No afirmable sin piloto + escucha humana |
| Loader oficial del pack `es-es` vs demo Space | Card indica assets del Space + código compartido; integración local exacta **por verificar** en piloto |
| Memory leak en workers largos MPS | Reportado en comunidad (#218) — favorece proceso efímero (opción A) |

#### 3. Comparación de arquitecturas

| | **A. Proceso Python one-shot** (Node `spawn`) | **B. Servicio HTTP localhost** |
| --- | --- | --- |
| Patrón | Como `macos-say` / CLI | Daemon + `POST /synthesize` |
| Cold start | Cada invocación carga modelo (coste alto si el load es lento) | Load una vez; requests baratos |
| Memoria | Se libera al salir | Resident; riesgo leak MPS en sesiones largas |
| Ops | Sin puerto ni healthcheck | Puerto, restart, logs, conflicto de puerto |
| Encaje repo | Mínimo; fácil de gitignore el venv | Más superficie (systemd/launchd, CORS, auth local) |
| Escala batch | Peor si N shorts seguidos | Mejor |

**Recomendación:** **A** para piloto e integración inicial.  
Justificación: generación es batch (1 narración/short), el repo ya spawnea procesos externos, evita daemon y leak MPS, y el CLI Python puede reutilizarse luego detrás de B sin cambiar `VoiceProvider`. Revisar B solo si el piloto demuestra que el cold-start domina el tiempo total en sesiones multi-short.

#### 4. Archivos que previsiblemente cambiarían (solo tras `approved` de integración)

| Área | Paths previstos |
| --- | --- |
| Provider | `src/shorts/voice/chatterbox.ts` (nuevo), `provider.ts` (`case 'chatterbox'`), `config/env.ts` (`VoiceProviderName`) |
| Pipeline | `generate-voice.ts` (extender `narrationCacheKey` con path muestra + model id + device + exaggeration/cfg) |
| Config docs | `.env.example`, `docs/voice.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` (entrada nueva) |
| Gobernanza | `tasks/*`, posiblemente `ROADMAP.md` nota |
| Tests | `tests/unit/voice.test.ts` (+ mocks spawn; sin pesos en CI) |
| Gitignore | `data/voices/*.wav`, caché HF local, venv Python, artefactos piloto |
| Piloto (fuera pipeline) | Script Python local / path gitignored — **no** en `src/shorts/pipeline/` |

**No tocar en integración:** beats, plantillas aceptadas, `quality-check` gate loudnorm, orden voice→loudnorm→render→post, `HelloRemotion` / `ScriptVideo`.

#### 5. Diseño de configuración y errores (propuesto)

```bash
# .env (local; nunca secretos de API para Chatterbox)
VOICE_PROVIDER=chatterbox
CHATTERBOX_PYTHON=/path/to/venv/bin/python   # o CHATTERBOX_BIN=...
CHATTERBOX_MODEL=es-es                       # es-es | multilingual-v3
CHATTERBOX_REF_WAV=/absolute/or/local/path/to/me.wav  # fuera de Git
CHATTERBOX_LANGUAGE_ID=es
CHATTERBOX_DEVICE=auto                       # auto → mps|cpu
CHATTERBOX_EXAGGERATION=0.5
CHATTERBOX_CFG_WEIGHT=0.5
CHATTERBOX_TIMEOUT_MS=300000                 # load+gen; > SHORTS_REQUEST_TIMEOUT_MS típico
```

- **WAV:** PCM mono 16-bit 24 kHz (nativo Chatterbox) → mismo contrato que OpenAI hacia `concatWavFiles` / loudnorm.
- **Errores:** fallo spawn / timeout / missing ref / missing python → fase `generating_voice` `failed` con mensaje claro; no degradar silenciosamente a mock.
- **Caché:** incluir en hash: texto+pausas, provider, model id, path/mtime/hash de `REF_WAV`, device, exaggeration, cfg.
- **Regeneración:** `short:voice --force` o cambio de hash.
- **Procedencia:** `providerMeta.voiceProvider='chatterbox'`, `model` = id real (p. ej. `chatterbox-mtl-es-es` / `v3`); `isTestAudio=false` solo si WAV real; mock sigue separado.
- **Proveedores actuales:** rama `switch` aditiva; default sin cambio.
- **Downstream:** sin cambios de contrato — loudnorm → SRT → Remotion → QC provenance.

#### 6. Plan de prueba piloto (fuera del pipeline)

**Prerrequisitos humanos:** Python 3.11, muestra limpia 10–30 s (silencio de fondo bajo, misma lengua/acento, mono preferible), espacio disco ≥10 GB, OK a descargar pesos (solo en máquina local).

1. Texto corto es-ES (≈1 frase de Shorts), p. ej. gancho + CTA.
2. Generar WAV con Multilingual V3 + `language_id=es` y, si el loader lo permite, con `Chatterbox-Multilingual-es-es`.
3. Medir: wall-clock load, wall-clock generate, device usado (`mps`/`cpu`), RAM pico.
4. Inspección técnica: duración, `sr==24000`, canales, bits, silencio inicial/final.
5. Escucha humana: inteligibilidad, naturalidad, pausas, **parecido a tu voz**, sesgo castizo vs andaluz.
6. **No** afirmar éxito de clonación/MPS hasta esos resultados.
7. Criterio go/no-go antes de cualquier PR de integración.

#### 7. Riesgos, licencia y privacidad

| Riesgo | Mitigación |
| --- | --- |
| Muestra biométrica de voz en Git | Path fuera de repo; ampliar `.gitignore`; no commitear WAV/pesos |
| Watermark Perth | Documentar; no eliminarlo; coherente con uso responsable |
| MIT software ≠ calidad dialéctica | Piloto de escucha obligatorio |
| Install frágil en Apple Silicon | Venv aislado; pin versiones; documentar parche mac |
| CI sin GPU/modelos | Tests solo contrato Node + mock spawn; piloto manual local |
| Confusión mock/real | Mantener `isTestAudio` estricto; nunca fingir provenance |

#### 8. Criterios de aceptación

**Piloto (tarea/autorización posterior):**

- [ ] WAV local generado sin pasar por `generar-short`.
- [ ] Métricas técnicas registradas (duración, sr, canales, tiempos).
- [ ] Escucha humana pass / pass-with-notes / fail.
- [ ] Comparación V3 vs `es-es` si ambas corrieron (o “es-es no cargó” documentado).
- [ ] Decisión go/no-go para integración.

**Integración futura (otra aprobación):**

- [ ] `VOICE_PROVIDER=chatterbox` produce `narration.wav` + loudnorm + QC `verified_provenance` en un job de prueba.
- [ ] Mock y providers actuales sin regresión (`npm test`, `typecheck`).
- [ ] Caché evita regen si texto+config+ref estables.
- [ ] Fallos no caen a mock.
- [ ] Docs + `.env.example` + gitignore; sin muestras/pesos en Git.
- [ ] Beats/QC/loudnorm/procedencia intactos.

#### 9. Recomendación final

1. Aceptar esta propuesta como diseño (`proposed` → revisión).
2. Autorizar **solo el piloto local** (install fuera del repo o venv gitignored).
3. Si el piloto es pass: nueva tarea `approved` de integración con arquitectura **A**.
4. Mantener OpenAI Cedar / file / ElevenLabs como alternativas; Chatterbox = opción local de clonación sin API de pago.

---

### `T-AV-QC-001` · post-P7 / pre-P8 · `accepted`

#### Aceptación humana (2026-10-19)

Estado: **`accepted`**. Humano (chat Cursor: `accepted`) tras revisión de los cuatro MP4.

- Ciclo: `proposed` → `approved` → `in_progress` → `review_required` → **`accepted`**.
- Voz de evidencia: OpenAI **Cedar**.
- Limitaciones conservadas: BGM vacío; placeholders logic-lateral; typo memory «RECORDISTE»; stack math; P8 `blocked`.
- **No autorizado en este acto:** P8 / YouTube; commit/push/merge; siguiente implementación.

#### Aprobación humana de inicio (2026-10-19)

- **Aprobado por:** humano (chat Cursor: `approved` + `OpenAI Cedar`).
- **Voz:** `VOICE_PROVIDER=openai-tts`, `VOICE_NAME=cedar` (allowlist + `.env`).
- **P8:** permanece `blocked`.

#### Informe de revisión — `T-AV-QC-001` (2026-10-19)

**Cambios**

- Topics: `data/topics/av-qc-{logic-lateral,math,memory,illusion}.json`
- Jobs: `output/av-qc-*/` (video.mp4, report.json, frames/, …)
- Doc: `docs/av-qc.md`; D016; enlaces README / openai-tts (`cedar`)
- Código mínimo: `cedar` en `OPENAI_TTS_VOICES` (`src/shorts/voice/openai-tts.ts`)
- Templates oficiales / P5 / QC / beats: **intactos**

**Comandos**

```bash
VOICE_NAME=cedar VOICE_PROVIDER=openai-tts npm run generar-short -- --input data/topics/av-qc-logic-lateral.json
VOICE_NAME=cedar VOICE_PROVIDER=openai-tts npm run generar-short -- --input data/topics/av-qc-math.json
VOICE_NAME=cedar VOICE_PROVIDER=openai-tts npm run generar-short -- --input data/topics/av-qc-memory.json
VOICE_NAME=cedar VOICE_PROVIDER=openai-tts npm run generar-short -- --input data/topics/av-qc-illusion.json
npm test          # 21 files / 102 passed
npm run typecheck # OK
```

**Resultados por familia**

| Job | Familia | validation | report.ok | loudnorm | eligible | MP4 | Duración |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `av-qc-logic-lateral` | logic-lateral | `partial` | true | verified | true | `output/av-qc-logic-lateral/video.mp4` | ~19.6s · 1080×1920 |
| `av-qc-math` | math | `auto_validated` | true | verified | true | `output/av-qc-math/video.mp4` | ~23.9s · 1080×1920 |
| `av-qc-memory` | memory | `auto_validated` | true | verified | true | `output/av-qc-memory/video.mp4` | ~21.6s · 1080×1920 |
| `av-qc-illusion` | illusion | **`partial`** | true | verified | true | `output/av-qc-illusion/video.mp4` | ~22.6s · 1080×1920 |

Voz en los cuatro: `gpt-4o-mini-tts/cedar`, no mock. Warning común: BGM vacío.

**Inspección visual (agente, frames)**

| Familia | Hallazgo frames | Severidad |
| --- | --- | --- |
| logic-lateral | Hook con interruptores/habitación; reveal bombilla ENCENDIDA=B; outro CTA comentar. Textos placeholder de plantilla. | limitation (placeholders) |
| math | Puzzle `7+5=?`; reveal `7+5=12`; respuesta «doce». Stack de ecuación repetida. | minor |
| memory | show 4 símbolos → hide → ask (falta verde) → reveal cuadrado verde. Outro typo «RECORDISTE». | minor (typo fixture) |
| illusion | Müller-Lyer puzzle; reveal con guías + «¡IGUALES!» / misma longitud. Status `partial` conservado. | OK perceptual (humano debe confirmar) |

**Audio**

- Técnico: loudnorm provenance OK; `finalAudio` OK; sin banner mock en metadatos.
- **Escucha / revisión humana de los 4 MP4:** aceptada 2026-10-19 (chat Cursor).

**Limitaciones**

- Sin BGM; no se valida mezcla.
- `eligible=true` ≠ autorización de publicar.
- Typo memory en fixture aceptado: no corregido en esta tarea (propuesta aparte si se desea).
- P8 `blocked`.

**Estado final:** `accepted` (2026-10-19). P8 permanece `blocked`. Sin siguiente tarea autorizada.

---

### `T-AV-QC-001` · detalle de propuesta (histórico `proposed`)

#### Resumen

Validación audiovisual real de la fábrica: un MP4 por familia (`logic-lateral`, `math`, `memory`, `illusion`) vía pipeline existente + inspección humana visual/auditiva + evidencias. **No** es publicación (P8).

#### Diagnóstico del repositorio (2026-10-19, sin renders)

| Capacidad | Estado verificado |
| --- | --- |
| Git | `main` @ `34c9faa` = `origin/main`; working tree limpio |
| Plantillas 4 familias | `data/templates/script-{logic-lateral,math,memory,illusion}.json` |
| Topics por familia | Solo logic-lateral en `data/topics/`; **no** hay topics math/memory/illusion |
| Pipeline | `generar-short` → `npm run short`; fases hasta `quality_check` + `report.json` |
| MP4 logic-lateral | Existe `output/s4-19-interruptores/video.mp4` (referencia) |
| MP4 math/memory/illusion | **No** existen; jobs `t-multiformat-d-accept-*` solo validate (`validation.json`) |
| SFX | `public/sfx/{tick,ding,pop,whoosh}.wav` presentes |
| BGM | `songs/catalog.json` → `tracks: []` (warning esperado) |
| Voz env | `.env` tiene `VOICE_PROVIDER=openai-tts` + clave; macOS `say` disponible (p. ej. Flo/Eddy es_ES) |
| FFmpeg sistema | No en PATH; fallback Remotion en `src/shorts/media/ffmpeg.ts` |
| QC | `report.ok` + `publishEligibility`; loudnorm por provenance; mock nunca elegible |
| Illusion | `validationStatus: partial`; nunca `auto_validated` (D014) |
| P7 / P8 | P7 `accepted`; P8 `blocked` |

#### Separación de responsabilidades (vinculante)

| Capa | Qué demuestra | Qué **no** demuestra |
| --- | --- | --- |
| Validación schema/narrativa (`short:validate`, `validation.json`) | Beat, puzzle, answerKey / reglas de familia | Que el vídeo se vea o suene bien |
| QC técnico (`report.json`) | MP4 existe/tamaño, resolución, SRT bounds, loudnorm provenance, SFX, BGM warning | Inspección humana AV; audio re-extraído del contenedor |
| `solution.validationStatus` / `auto_validated` | Coherencia declarativa del acertijo | Percepción / UX / sync |
| Inspección AV humana (esta tarea) | Checklist visual + auditiva sobre MP4 real | Autorización de publicar |
| Autorización de publicar | Decisión humana explícita (+ P8 si algún día se aprueba) | — |

`publishEligibility.eligible=true` ≠ OK audiovisual. Illusion **no** puede pasar a `auto_validated`.

#### Procedimiento de renderizado propuesto (tras `approved`)

1. **Preparar copias** (no editar fixtures aceptados):

```bash
cp data/templates/script-logic-lateral.json data/topics/av-qc-logic-lateral.json
cp data/templates/script-math.json data/topics/av-qc-math.json
cp data/templates/script-memory.json data/topics/av-qc-memory.json
cp data/templates/script-illusion.json data/topics/av-qc-illusion.json
# Editar solo id → av-qc-logic-lateral | av-qc-math | av-qc-memory | av-qc-illusion
```

2. **Provider de voz (elegir uno, documentar):**
   - Preferido sin coste: `VOICE_PROVIDER=macos-say` (voz es_ES existente).
   - Alternativa gratis: `VOICE_PROVIDER=file` tras `short:record`.
   - OpenAI TTS: solo con OK humano de gasto (ya hay clave en `.env`).
   - Mock: solo si se acepta banner + `eligible=false` (no cuenta como narración de producción).

3. **Assets previos:**

```bash
test -f public/sfx/tick.wav || npm run sfx:generate
# BGM: catálogo vacío → continuar; anotar limitación
```

4. **Render por familia** (pipeline existente):

```bash
npm run generar-short -- --input data/topics/av-qc-logic-lateral.json
npm run generar-short -- --input data/topics/av-qc-math.json
npm run generar-short -- --input data/topics/av-qc-memory.json
npm run generar-short -- --input data/topics/av-qc-illusion.json
```

5. **Tests de regresión** (no sustituyen AV):

```bash
npm test && npm run typecheck
```

6. **Inspección humana** con checklists abajo; capturar fotogramas relevantes (hook / countdown / reveal / outro como mínimo).

7. **Registrar evidencias** en esta sección (tabla por familia).

#### Comandos reales identificados

| Comando | Uso |
| --- | --- |
| `npm run generar-short -- --input <json>` | Pipeline completo (voz→SRT→render→post→QC) |
| `npm run short -- --input <json>` | Igual vía CLI |
| `npm run short:validate -- --input <json>` / `--id` | Solo validación |
| `npm run short:voice` / `short:render` / `short:post` / `short:resume` | Fases parciales |
| `npm run short:preview -- --id <id>` | Preview media res |
| `npm run short:studio-props -- --id <id>` | Props Studio (requiere `public/shorts/<id>/` para audio) |
| `npm run sfx:generate` | Regenerar SFX procedurales |
| `npm run dev` | Studio interactivo (no sustituye MP4 full) |

#### Requisitos / bloqueos por familia

| Familia | Fixture origen | Validación tipica | Narración / assets | Notas AV |
| --- | --- | --- | --- | --- |
| logic-lateral | `script-logic-lateral.json` | `partial` (three-switches) | SFX countdown/reveal; BGM opcional | Referencia histórica `s4-19-interruptores` |
| math | `script-math.json` | `auto_validated` | Legibilidad ecuación + reveal `7+5=12` | `auto_validated` ≠ OK visual |
| memory | `script-memory.json` | `auto_validated` | Fases visuales show→hide→ask→reveal en beats puzzle/countdown/hint/reveal | Verificar claridad de cada fase |
| illusion | `script-illusion.json` | **`partial`** (siempre) | Reveal con `compareMode`+`showGuides` | Percepción humana obligatoria |

#### Checklist visual (humano)

- [ ] Formato 9:16; dimensiones ~1080×1920 (o documentar desviación)
- [ ] Textos legibles (contraste, tamaño, sin overflow)
- [ ] Encuadre / composición; sin elementos cortados
- [ ] Countdown y transiciones comprensibles
- [ ] Beats en orden de familia; sync percibido voz↔escena
- [ ] Reveal claro
- [ ] Sin pantallas vacías / artefactos graves
- [ ] Outro con CTA a comentar (voz + on-screen)
- [ ] Sin banner «AUDIO DE PRUEBA» si se usó voz no-mock

#### Checklist de audio (humano)

- [ ] Narración presente e inteligible
- [ ] Sync voz–imagen aceptable
- [ ] Sin cortes al inicio/final de escenas relevantes
- [ ] Volumen percibido OK; loudnorm: revisar `report.checks.narrationLoudnorm` + provenance (no re-extraer salvo decisión futura)
- [ ] Música: ausente si catálogo vacío (esperado) o balanceada si hay pista
- [ ] SFX audibles donde aplique (tick / ding / whoosh / pop)
- [ ] Sin silencios largos inesperados ni clipping obvio

#### Checklist por familia

- **logic-lateral:** reto/reglas coherentes; secuencia interruptores/bombilla; reveal correcto.
- **math:** problema legible; respuesta correcta en reveal; explicación sigue el método.
- **memory:** show → hide → ask → reveal perceptibles; elemento faltante claro.
- **illusion:** efecto óptico se percibe; guías en reveal comprensibles; status sigue `partial`.

#### Evidencias a conservar (por job)

- Job id · familia · path fixture origen (copia topic)
- Comandos ejecutados · provider de voz · resultado `npm test` / `typecheck`
- `validation.json` (level/status) · `report.json` (`ok`, blocking, warnings, `publishEligibility`)
- Path `video.mp4` (+ opcional `video-preview.mp4`, `thumbnail.png`)
- Fotogramas clave · veredicto humano (pass / pass-with-notes / fail)
- Defectos: descripción, severidad (`blocker` / `major` / `minor` / `limitation`)

#### Cambios de pipeline (solo si hicieran falta — propuesta separada)

No implementar en `T-AV-QC-001`. Ejemplos a aparcar: helper de extracción de frames; plantilla de ficha AV; re-QC de jobs antiguos; loudnorm del mix final; curación BGM. Cada uno = tarea `proposed` aparte.

#### Criterios de aceptación

Ver checklist en `tasks/active.md` (`T-AV-QC-001`). Cierre solo con `accepted` humano tras inspección AV real.

#### Estado de aprobación

`proposed` — 2026-10-19 (agente, chat Cursor). Esperando humano → `approved` para ejecutar renders.

**No autorizado aún:** renders, cambios de código/fixtures, P8, commit/push/merge, APIs de pago nuevas.

---

### `T-STUDIO-001` · P7 · `accepted`

#### Aceptación humana — P7 / T-STUDIO-001 (2026-10-19)

Estado: **`accepted`**. Fase P7: **`accepted`** (humano, chat Cursor 2026-10-19).

La revisión humana acepta el alcance entregado **sujeto a comprobaciones finales**, que el agente re-ejecutó y pasó:

- Diff (commit `1e2151c`) dentro del alcance P7: docs Studio, defaults ShortVideo ← logic-lateral, helper `short:studio-props`, tests, D015; sin deps; sin P5/QC; sin alterar beats A–D ni contratos HelloRemotion/ScriptVideo.
- `npm test` → 21 files / **102** tests passed.
- `npm run typecheck` → OK.
- `npm run short:studio-props -- --id s4-19-interruptores` → `studio-props.json` con `hasAudio: true`, `hasMusic: true` (rutas bajo `public/shorts/s4-19-interruptores/`).
- Default Studio: familia resuelta `logic-lateral`, beat oficial; audio/música `null` en defaults (solo visual).

**Documentado explícitamente:** el audio en Studio depende de los archivos disponibles en `public/shorts/<id>/`. Sin esos archivos, Studio va mudo (esperado).

**Pendiente (no bloquea `accepted` de P7):** validación audiovisual real (render/inspección humana de preview). **No** se afirma render ni inspección AV en este acto.

**No autorizado en este acto:** P8 / YouTube; deps nuevas; tocar P5/QC o beats; commit/push/merge.

#### Aprobación humana de inicio — P7 / T-STUDIO-001 (2026-10-19)

- **Alcance autorizado:** Studio/preview documentado y estable (docs, defaults ShortVideo en Studio, helper `studio-props`, tests); sin YouTube; sin alterar beats ni HelloRemotion/ScriptVideo; sin deps; sin P5/QC; sin commit/push/merge.
- **Aprobado por:** humano (chat Cursor: `approved`).
- **Estado:** `approved` → `in_progress` → `review_required` → **`accepted`**.

#### Informe de revisión — `T-STUDIO-001` / P7 (pre-aceptación)

- **Cambios:**
  - Nuevo: `docs/studio-preview.md`, `src/shorts/remotion/studio-defaults.ts`, `studio-props.ts`, `src/cli/studio-props.ts`, `tests/unit/studio-preview.test.ts`
  - `ShortVideo` defaultProps ← plantilla logic-lateral (visual)
  - `package.json` script `short:studio-props`
  - Docs: README, usage, tooling, troubleshooting, ARCHITECTURE, D015
- **Decisiones:** tres vías (Studio / CLI preview / post preview); Studio no vacío; helper props desde job.
- **Comandos (implementación + re-verificación de aceptación):**
  - `npm test` → 21 files / **102** tests passed · `typecheck` OK
  - `npm run short:studio-props -- --id s4-19-interruptores` → `studio-props.json` (audio+music vía `public/shorts/<id>/`)
- **Limitaciones:** default Studio sin voz; audio Studio = `public/shorts/<id>/`; AV real pendiente; P8 blocked.
- **Estado final:** `accepted` (P7); P8 `blocked`.

---

### `T-MULTIFORMAT-001` · P6 · entrega D `accepted` · fase P6 `accepted`

#### Aceptación humana — entrega D + cierre P6 (2026-10-19)

Estado D: **`accepted`**. Estado P6: **`accepted`** (humano, chat Cursor 2026-10-19).

La revisión humana acepta el alcance entregado y cierra la fase:

- Fixture `data/templates/script-illusion.json`.
- Beat específico de illusion (`hook` → `puzzle` → `countdown` → `explanation` → `reveal` → `outro`).
- Validaciones geométrica (`validateOpticalIllusion`) y narrativa (`validateIllusionNarrative`).
- Reveal exige `compareMode=true` y `showGuides=true`.
- Illusion **nunca** puede obtener `auto_validated` (siempre `partial` / `pending_review`).
- Tests y typecheck superados en la verificación de aceptación.
- Regresión validate: illusion=`partial`; math/memory=`auto_validated`; logic-lateral=`partial`.
- Beats aceptados de A/B/C **no** modificados en este cierre.

**Significado de P6 (vinculante):** incorporación **técnica** de las familias (plantillas, beats, validadores, componentes, tests). **No** implica validación audiovisual de todos los formatos.

**Limitaciones documentadas (vinculantes):**

- Comprobaciones = **`--mode validate`**, no render ni inspección audiovisual.
- Fixtures / camino feliz ≠ cobertura exhaustiva de edge cases.
- Illusion: revisión humana perceptual pendiente (status `partial` por diseño).
- P5/QC intactos. Sin deps nuevas. Sin publish YouTube.

**Aceptado por:** humano (chat Cursor).  
**No autorizado en este acto:** implementar P7; tocar P5/QC; alterar beats; commit/push/merge; YouTube.

#### Verificación de aceptación (ejecutada 2026-10-19, validate only)

```bash
npm test          # 20 files / 99 tests passed
npm run typecheck # OK
# illusion → partial
# math → auto_validated
# memory → auto_validated
# logic-lateral → partial (esperado)
```

#### Aprobación humana — inicio entrega D (2026-10-19)

- **Alcance autorizado:** familia illusion (JSON, beat propio, builder, validador `partial`/`pending_review` + compareMode/showGuides, componente, tests, docs).
- **Aprobado por:** humano (chat Cursor: `approved`).
- **Estado D (ciclo):** `approved` → `in_progress` → `review_required` → **`accepted`**.
- **Estado P6 (ciclo):** `proposed` → **`accepted`** (mismo acto de aceptación D + cierre explícito).

#### Informe de revisión — `T-MULTIFORMAT-001` / entrega D (pre-aceptación)

- **Cambios:**
  - Nuevo: `data/templates/script-illusion.json`, `tests/unit/illusion-family.test.ts`
  - `optical-illusion.ts` (beat + `family` + CTA), `registry.ts` (exactSequence illusion)
  - `puzzle-validator.ts` (`validateIllusionNarrative` + cap nunca `auto_validated`)
  - `OpticalIllusion.tsx` (badge, guías alineadas, comparePop); docs D014
- **Decisiones:** beat illusion propio; reveal exige `compareMode`+`showGuides`; status siempre `partial`/`pending_review`.
- **Comandos (validate only — no render / no AV):**
  - `npm test` → 20 files / **99** tests passed · `typecheck` OK
  - validate `script-illusion.json` → **`partial`**
  - validate `script-memory.json` → `auto_validated`
  - validate `script-math.json` → `auto_validated`
  - validate `script-logic-lateral.json` → OK (`partial`)
- **Estado tras aceptación:** D `accepted`; P6 `accepted`; P7 `proposed`; P8 `blocked`.
- **Siguiente:** espera `approved` humano explícito antes de implementar P7.

### `T-MULTIFORMAT-001` · P6 · entrega C `accepted` (A+B `accepted`)

#### Aceptación humana — entrega C (2026-10-19)

Estado: **`accepted`** (humano, chat Cursor 2026-10-19).

La revisión humana acepta el alcance entregado:

- Fixture `data/templates/script-memory.json`.
- Beat específico de memory (`hook` → `puzzle` → `countdown` → `hint` → `reveal` → `outro`).
- Fases visuales `show` → `hide` → `ask` → `reveal`.
- Validador `validateMemoryNarrative` (elementos presentados ↔ pregunta ↔ respuesta revelada; en `ask`, `missingId` no figura en `items`).
- Componente `MemoryChallenge`.
- Tests y typecheck superados.
- Regresión **validate** de math y logic-lateral ejecutada.

**Limitaciones documentadas (vinculantes):**

- Las comprobaciones realizadas corresponden a **validación** (`--mode validate`), **no** a render ni inspección audiovisual.
- Alcance de la validación memory: el fixture / tests del camino feliz **no demuestran cobertura exhaustiva de casos límite**.
- En el momento de la aceptación C: Illusion (D) pendiente. *(D y P6 quedaron `accepted` el 2026-10-19.)* Beats de logic-lateral, math y memory intactos en este cierre. P5/QC intactos.

**Aceptado por:** humano (chat Cursor).  
**No autorizado en este acto:** implementar D; cerrar P6; commit/push/merge; alterar beats logic-lateral / math / memory; tocar P5/QC.

#### Aprobación humana — inicio entrega C (2026-10-19)

- **Alcance autorizado:** familia memory (JSON, beat propio, builder, validador/fases/narrativa, componente, tests, docs).
- **No autorizado:** D; cambiar beat logic-lateral; P5/QC; deps; YouTube; commit/push/merge; P6 → `accepted`.
- **Aprobado por:** humano (chat Cursor: `approved`).
- **Estado C (ciclo):** `approved` → `in_progress` → `review_required` → **`accepted`**.

#### Informe de revisión — `T-MULTIFORMAT-001` / entrega C (pre-aceptación)

- **Cambios:**
  - Nuevo: `data/templates/script-memory.json`, `tests/unit/memory-family.test.ts`
  - `memory-challenge.ts`, `registry.ts` (exactSequence memory)
  - `puzzle-validator.ts` (fases ask/reveal + `validateMemoryNarrative`)
  - `MemoryChallenge.tsx`; docs D013; README / generar-short / ARCHITECTURE
- **Decisiones:** beat memory propio; fases `show→hide→ask→reveal`; ask sin missingId en items.
- **Comandos (validate only — no render / no AV):**
  - `npm test` → 19 files / **92** tests passed · `typecheck` OK
  - validate `script-memory.json` → **`auto_validated`**
  - validate `script-math.json` → `auto_validated`
  - validate `script-logic-lateral.json` → OK (`partial`)
- **Limitaciones:** no render/AV; fixture ≠ edge cases exhaustivos; D pendiente.
- **Estado tras aceptación:** C `accepted`; D `proposed`; P6 `proposed`.
- **Siguiente:** espera `approved` humano explícito antes de implementar D.

### `T-MULTIFORMAT-001` · P6 · entrega B `accepted` (histórico · A `accepted`)

#### Aceptación humana — entrega B (2026-10-19)

Estado: **`accepted`** (humano, chat Cursor 2026-10-19).

La revisión humana acepta el alcance entregado:

- Fixture `data/templates/script-math.json`.
- Beat específico de math.
- Validación `answerKey` frente a reveal.
- Componente `MathPuzzle`.
- Tests y typecheck superados.
- Regresión validate de logic-lateral ejecutada correctamente.

**Limitaciones documentadas (vinculantes):**

- Las comprobaciones realizadas corresponden a **validación**, **no** a render ni inspección audiovisual.
- Alcance de la validación matemática: el fixture / tests del camino feliz **no demuestran cobertura exhaustiva de casos límite**.
- En el momento de la aceptación B: narrativa memory/illusion pendiente (C/D). *(C quedó `accepted` el 2026-10-19; D sigue `proposed`.)* Beat logic-lateral y P5/QC intactos.

**Aceptado por:** humano (chat Cursor).  
**No autorizado en este acto:** implementar C/D; cerrar P6; commit/push/merge; alterar beat logic-lateral o P5/QC.

#### Aprobación humana — inicio entrega B (2026-10-19)

- **Alcance autorizado:** familia math (JSON referencia, beat propio, builder, validador/narrativa básica, componente, tests, docs).
- **No autorizado:** C/D; cambiar beat logic-lateral; P5/QC; deps; YouTube; commit/push/merge; P6 → `accepted`.
- **Aprobado por:** humano (chat Cursor: `approved`).
- **Estado B (ciclo):** `approved` → `in_progress` → `review_required` → **`accepted`**.

#### Informe de revisión — `T-MULTIFORMAT-001` / entrega B (pre-aceptación)

- **Cambios:**
  - Nuevo: `data/templates/script-math.json`, `tests/unit/math-family.test.ts`
  - `src/shorts/templates/math-puzzle.ts`, `registry.ts` (exactSequence math + reference path)
  - `puzzle-validator.ts` (`validateArabicEquation`, `validateMathNarrative`, math orquestado)
  - `MathPuzzle.tsx` (pulido visual)
  - Docs: README plantillas, ARCHITECTURE, DECISIONS D012, generar-short; gobernanza
- **Decisiones:** beat math propio (≠ logic-lateral); plantilla aritmética `auto_validated`; narrativa = coherencia answerKey↔reveal (sin LLM).
- **Comandos (validación, no render/AV):**
  - `npm test` → 18 files / **86** tests passed
  - `npm run typecheck` → OK
  - validate `script-math.json` → **`auto_validated`**
  - validate `script-logic-lateral.json` → OK (`partial`, esperado)
- **Limitaciones:** validate only; fixture ≠ cobertura exhaustiva de edge cases; narrativa memory/illusion pendiente C/D; cerillas sin ecuación arábiga → `partial`.
- **Estado tras aceptación:** B `accepted`; C/D `proposed`; P6 `proposed`.
- **Siguiente:** espera `approved` humano explícito antes de implementar C.

### `T-MULTIFORMAT-001` · P6 · entrega A `accepted` (histórico)

#### Aceptación humana — entrega A (2026-10-19)

Estado: **`accepted`** (humano, chat Cursor 2026-10-19).

La revisión humana confirma el alcance acordado:

- Contrato multiformato y resolución de familias implementados.
- Campo `family` opcional y compatibilidad con logic-lateral.
- Beat oficial de logic-lateral sin cambios.
- Sin modificaciones de P5/QC ni nuevas dependencias.
- `npm test`: 79 tests passed.
- `npm run typecheck`: OK.
- Regresión de **validate** ejecutada correctamente.

**Limitaciones documentadas (vinculantes):**

- La regresión realizada fue de **`--mode validate`**, **no** un render ni una inspección audiovisual.
- Queda pendiente la **validación narrativa específica** de math, memory e illusion (entregas B–D).
- `buildFromTitle` no registrado en el registry (generación en `script-generator.ts`).

**Aceptado por:** humano (chat Cursor).  
**No autorizado en este acto:** implementar B/C/D; cerrar P6 como `accepted`; commit/push/merge; alterar beat logic-lateral; tocar P5/QC.

#### Aprobación humana — inicio entrega A (2026-10-19)

- **Alcance autorizado:** solo entrega A (contrato, registry, `family` opcional, validación compartida/específica, beat checker de reglas comunes, tests/regresión logic-lateral, docs del contrato).
- **No autorizado:** B, C, D; cambiar beat oficial logic-lateral; deps; YouTube; commit/push/merge; P6 → `accepted`.
- **Gate del beat:** no imponer a todas las familias la secuencia interna de logic-lateral; el contrato expresa reglas comunes y permite beats por familia cuando se aprueben B/C/D; CTA comentar = convención compartida opcional (sin forzar interacción artificial ni alterar el formato oficial).
- **Aprobado por:** humano (chat Cursor).
- **Estado A (ciclo):** `approved` → `in_progress` → `review_required` → **`accepted`**.

#### Informe de revisión — `T-MULTIFORMAT-001` / entrega A (pre-aceptación)

- **Cambios:**
  - Nuevos: `src/shorts/templates/types.ts`, `registry.ts`, `src/shorts/domain/beat-check.ts`, `tests/unit/template-family.test.ts`
  - Schema: `family` opcional (`script.schema.ts`)
  - Validación: `validateFamilyPuzzle` + orquestación en `puzzle-validator.ts`; `validate-script.ts` persiste `family` resuelta
  - Generación: `script-generator.ts` adjunta `family` inferida
  - Docs: ARCHITECTURE, DECISIONS D011, generar-short; gobernanza ROADMAP / active / approvals
- **Decisiones de diseño:**
  - Beat común = presencia `hook`+`reveal`+`outro` (sin orden)
  - `exactSequence` solo `logic-lateral`
  - `preferCommentCta` = warning, no fail
  - Inferencia: visuales logic-lateral → `logic-lateral`; resto por `format`
  - `buildFromTitle` **no** en registry (evita ciclo `registry`↔`select`↔`puzzle-validator`); builders siguen en `script-generator`
- **Comandos ejecutados:**
  - `npm test` → 17 files / **79** tests passed
  - `npm run typecheck` → OK
  - `npm run short -- --input data/templates/script-logic-lateral.json --mode validate --id t-multiformat-a-regression` → Validación OK (`partial`, esperado three-switches); `script.family === "logic-lateral"`
- **Resultados:** criterios de A cumplidos en lo verificable por código/tests/regresión **validate** (sin render, sin inspección audiovisual, sin publish).
- **Diferencias vs alcance aprobado:** ninguna funcional de B/C/D; matización: `buildFromTitle` tipado pero no registrado.
- **Limitaciones:** validación narrativa math/memory/illusion pendiente B–D; regresión = validate only; artifact `output/t-multiformat-a-regression/`.
- **Evidencias:** paths arriba; tests `template-family.test.ts`; D011.
- **Estado tras aceptación:** entrega A `accepted`; B/C/D `proposed`; P6 `proposed`.
- **Siguiente:** espera `approved` humano explícito antes de implementar B.

Estado previo del diseño: **`proposed`** (agente, 2026-10-19).

#### Hallazgos de inspección (2026-10-19)

**Git:** `main` limpio y sync con `origin/main` (`39e49a5`). Sin cambios locales ajenos a sobrescribir.

**Ya existe (scaffolding, no al nivel logic-lateral):**

| Pieza | Estado |
| --- | --- |
| `formatSchema` | Enum: `find-different`, `math-puzzle`, `optical-illusion`, `logic-puzzle`, `memory-challenge` |
| Visuales Zod | `math-puzzle`, `memory-challenge`, `optical-illusion` (+ logic-lateral específicos) |
| Builders | `buildMathPuzzleScript`, `buildMemoryChallengeScript`, `buildOpticalIllusionScript` (1 puzzle hardcodeado c/u) |
| `detectFormat` / `generateFromTemplate` | Routing por título → builder |
| Componentes Remotion | `MathPuzzle`, `MemoryChallenge`, `OpticalIllusion` cableados en `ShortVideo` |
| Validadores | Existen; illusion → `partial`; matchsticks math → parcial/frágil |
| Plantilla JSON oficial | Solo `data/templates/script-logic-lateral.json` |

**Reutilizable (pipeline / shared):** fases `run.ts`, schemas base de escena, voz/SRT/render/post/QC, `Hook`/`CountdownTimer`/`text`/`Sfx`/`theme`, job-store, `--input` → `parseVideoScript`.

**Específico logic-lateral:** beat `hook→instruction→countdown→explanation→reveal→outro` CTA; visuales `logic-room` / `switch-sequence` / `bulb-state-reveal`; `three-switches.ts`; referencia `output/s4-19-interruptores/`.

**Gap:** no hay contrato `TemplateFamily` común; beats de stubs ≠ beat oficial; sin JSON de referencia por familia; calidad visual/validación insuficiente para “al nivel logic-lateral”.

#### Arquitectura propuesta

```text
                    ┌─────────────────────────────┐
  título / --input  │  FamilyResolver             │
                    │  (format + optional family) │
                    └─────────────┬───────────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
   TemplateFamily           TemplateFamily           TemplateFamily
   logic-lateral *          math                     memory / illusion
   (referencia; no tocar    (entrega B)              (C / D)
    beat en P6)
         │                        │                        │
         └────────────┬───────────┴────────────┬───────────┘
                      ▼                        ▼
              videoScriptSchema          puzzle-validator
              (scenes + visuals)         shared + per-family
                      ▼
              ShortVideo → VisualRouter → componentes repo
```

\* logic-lateral sigue siendo el formato de referencia; P6 no altera su beat.

##### 1. Contrato TypeScript común

Nuevo módulo propuesto `src/shorts/templates/types.ts`:

```ts
export type TemplateFamilyId =
  | 'logic-lateral'
  | 'math'
  | 'memory'
  | 'illusion';

export type TemplateBuildOptions = {
  language: string;
  fps: number;
  width: number;
  height: number;
  targetDurationSeconds: number;
};

export type BeatSpec = {
  /** Orden obligatorio de scene.type para esta familia. */
  requiredSceneTypes: Array<
    'hook' | 'instruction' | 'puzzle' | 'countdown' | 'hint' | 'explanation' | 'reveal' | 'outro'
  >;
  /** Si true, outro debe incluir CTA a comentar (voz + onScreenText). */
  requireCommentCta: boolean;
};

export type TemplateFamily = {
  id: TemplateFamilyId;
  /** Valor(es) de VideoScript.format compatibles. */
  formats: Array<z.infer<typeof formatSchema>>;
  beat: BeatSpec;
  /** Visual templates permitidos en puzzle/reveal/explanation. */
  allowedVisualTemplates: string[];
  buildFromTitle: (title: string, id: string, opts: TemplateBuildOptions) => VideoScript;
  /** Path relativo a data/templates/ del JSON de referencia (si existe). */
  referenceTemplatePath?: string;
  validateVisual: (visual: Visual, script: VideoScript) => PuzzleValidationResult;
};
```

Registro: `TEMPLATES: Record<TemplateFamilyId, TemplateFamily>` + `resolveFamily(script | title | format)`.

**Decisión pendiente (gate humano en entrega A):** ¿math/memory/illusion adoptan el **mismo beat** que logic-lateral (recomendado para paridad de producto) o beats propios documentados? La propuesta asume **mismo beat** + CTA comentar, con `puzzle` opcional donde logic-lateral usa `instruction`+visual de reglas.

##### 2. Esquema JSON discriminado por familia

Aditivo, sin romper jobs existentes:

- Opción preferida: campo opcional `family` en `videoScriptSchema` (`z.enum([...]).optional()`); si ausente, inferir desde `format` + visuales (logic-puzzle + bulb-state-reveal → logic-lateral).
- Mantener `format` actual para compatibilidad.
- Discriminación de **visuales** ya existe (`visualSchema` discriminatedUnion por `template`).
- Añadir JSON de referencia:
  - `data/templates/script-math.json`
  - `data/templates/script-memory.json`
  - `data/templates/script-illusion.json`
- `--input` sigue pasando por `parseVideoScript`; sin cambios de CLI obligatorios.

##### 3. Validación compartida vs específica

| Capa | Qué valida |
| --- | --- |
| Compartida | `parseVideoScript` Zod; beat (`BeatSpec`); presencia CTA si `requireCommentCta`; duración mínima de escenas; `solution.validationStatus` coherente |
| logic-lateral | `validateBulbStateReveal` + checks actuales (sin cambio de reglas) |
| math | aritmética / cerillas (endurecer matchsticks; evitar eval frágil); `auto_validated` o `partial` |
| memory | `missingId` / `sequence` ∈ items; fases coherentes show→hide→ask→reveal |
| illusion | geometría declarada + **siempre** `partial` o `pending_review` (percepción subjetiva) |

`validateScriptPuzzles` delega a `family.validateVisual` tras resolver familia.

##### 4. Resolución de plantilla en el pipeline

1. Si `--input` con script completo → parse → `resolveFamily(script)` → validar beat+puzzle (no regenerar).
2. Si título + `aiProvider=template` → `detectFormat` / `resolveFamily(title)` → `family.buildFromTitle`.
3. Si LLM → prompts por familia (futuro; fuera de entrega A mínima) + parse + misma validación.

No tocar orden de fases del job ni provenance loudnorm/QC de P5.

##### 5. Organización de componentes y assets

```text
src/shorts/remotion/components/
  shared/     # (opcional refactor liviano) Hook, Countdown, text wrappers — solo si hace falta
  logic/      # LogicRoom, SwitchSequence, BulbStateReveal (sin mover en A si rompe imports)
  math/       # MathPuzzle (+ subvariantes cerillas si crecen)
  memory/     # MemoryChallenge
  illusion/   # OpticalIllusion
```

Entrega A puede **no** mover archivos (solo contrato + registry) para minimizar diff. Movimientos de carpetas = decisión humana en B/C/D.

Assets: sin packs nuevos; SFX procedural compartido; BGM catálogo P5 (0 pistas OK). Thumbnail sigue layout único (D009) hasta nueva decisión.

##### 6. Estrategia de pruebas

| Nivel | Cobertura |
| --- | --- |
| Unit contrato | registry, `resolveFamily`, beat checker, inferencia sin `family` |
| Unit validadores | math / memory / illusion casos ok+fail; logic-lateral regresión (`three-switches.test.ts`) |
| Unit schema | JSON fixtures parsean; scripts logic-lateral históricos parsean |
| Integración | pipeline con `--input` fixture por familia hasta `validating` (mock voice); logic-lateral fixture no cambia |
| Smoke render | opcional post-`approved` por familia; no TTS de pago sin OK |

##### 7. Compatibilidad logic-lateral

- No cambiar beat ni visuales oficiales.
- Jobs en `output/` / templates existentes: sin migración obligatoria (`family` opcional).
- Tests `three-switches`, schema logic-lateral, QC loudnorm: deben seguir pasando sin cambios de comportamiento.
- `HelloRemotion` / `ScriptVideo` intactos.

#### Orden de entrega (incremental)

| ID | Entrega | Contenido | Criterios de aceptación (independientes) |
| --- | --- | --- | --- |
| **A** | Contrato multiformato | `TemplateFamily` + registry + `resolveFamily` + beat checker + `family?` en schema + tests de regresión logic-lateral + docs DECISIONS | (1) logic-lateral builds/tests verdes sin cambio de beat; (2) resolver infiere familia desde scripts actuales; (3) `npm test` + `typecheck` OK; (4) sin deps nuevas; (5) sin JSON nuevos obligatorios aún |
| **B** | Familia math | JSON referencia + pulir builder/componente/validador + tests + doc generar-short | (1) `--input data/templates/script-math.json` valida; (2) al menos 1 puzzle `auto_validated`; (3) beat+CTA según A; (4) regresión logic-lateral OK |
| **C** | Familia memory | Igual patrón memory | (1) fixture JSON valida; (2) missingId/sequence `auto_validated`; (3) fases visuales coherentes; (4) regresión A+B + logic-lateral |
| **D** | Familia illusion | Igual patrón illusion | (1) fixture JSON valida; (2) status `partial`/`pending_review` documentado; (3) guías compareMode; (4) regresión A–C + logic-lateral |

Cada entrega: `proposed` → `approved` (humano) → `in_progress` → `review_required` → `accepted` (humano). Se puede aprobar solo A primero.

#### Archivos que previsiblemente cambiarían (post-aprobación)

- `src/shorts/templates/types.ts` (nuevo), `select.ts`, builders por familia, `script-generator.ts`
- `src/shorts/domain/script.schema.ts`, `puzzle-validator.ts` (± split)
- `data/templates/script-{math,memory,illusion}.json` + README
- Componentes Remotion existentes (pulido; sin JSX LLM)
- `tests/unit/*`, `tests/integration/*`
- `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`, `docs/generar-short.md`
- Gobernanza: `tasks/*`, `ROADMAP.md`

#### Riesgos

- Unificar beats puede requerir reescribir stubs actuales (aceptable: no son referencia de producción).
- Matchstick validation hoy frágil → riesgo de falsos `auto_validated`.
- Illusion nunca será fully auto → política humana explícita.
- Refactor de carpetas Remotion puede generar churn de imports → diferir a B+ si no es necesario.
- Ampliar LLM prompts por familia sin gate → fuera de A.

#### Pruebas necesarias (cuando haya `approved`)

```bash
npm test
npm run typecheck
# por entrega, además:
# npm run generar-short -- --input data/templates/script-logic-lateral.json  # regresión
# npm run generar-short -- --input data/templates/script-math.json           # desde B
```

#### Condiciones generales (vinculantes)

- Beat logic-lateral intacto · sin JSX/TSX por LLM · sin deps sin autorización · sin YouTube/pago · sin commit/push/merge sin pedido · P6/`T-MULTIFORMAT-001` no pasan a `approved`/`accepted` por el agente.

#### Estado de aprobación

`proposed` — 2026-10-19. Esperando revisión humana.

---

### `T-QC-LOUDNORM-001` · P5 · `accepted`

Estado: **`accepted`** (humano, chat Cursor 2026-10-19, tras auditoría final).

#### Objetivo

Bloquear el QC técnico cuando voz real falla el gate obligatorio de loudnorm; añadir `publishEligibility` en `report.json`; mock nunca publicable.

#### Alcance (ajustes aprobados)

1. **QC técnico:** voz real + loudnorm `failed` / `unverified` / no normalizado → blocking → `report.ok=false` → fase failed. `mock_omitted` puede pasar QC si no hay otros blocking.
2. **Elegibilidad:** `publishEligibility.eligible` + `reasons`; mock nunca elegible; voz real solo con gate loudnorm + controles técnicos. `eligible=true` ≠ validación audiovisual humana ni inspección del audio del MP4.
3. **BGM:** catálogo vacío = warning; no bloquea QC ni elegibilidad por defecto; sin pistas sin licencia.
4. **Estados:** sin migración automática; documentar revalidación; MP4 existente ≠ publicable solo por existir.
5. Tests + docs; `npm test` + typecheck; sin pago/YouTube/deps/beat/commit/accepted automático.

#### Evidencias de implementación (2026-10-19)

- **Git pre-flight:** `main` limpio y sync con `origin/main` (`a4001a7`) antes de implementar.
- **Código:** `applyNarrationLoudnormGate`, `computePublishEligibility`, `QualityReport.publishEligibility` en `quality-check.ts`.
- **Tests:** `tests/unit/quality-check.test.ts` (blocking voz real, mock no elegible, verified elegible, provenance ausente/raw).
- **Docs:** D010; `generar-short.md` (QC vs elegibilidad + revalidación); `tooling.md`; `troubleshooting.md`.
- **Comandos:** `npm test` → 16 files / **72** tests passed · `npm run typecheck` OK.

#### Evidencias de aceptación (2026-10-19)

- Auditoría final solo lectura: **7/7 criterios PASS**.
- `npm test`: 16 archivos / 72 tests; `npm run typecheck`: OK.
- Fallo loudnorm (voz real) bloquea QC técnico; mock puede pasar QC pero nunca es elegible; provenance P5 intacta; BGM vacío no bloquea.
- Aceptado por: humano (chat Cursor). Sin commit/push/merge en la aceptación documental.

#### Estado de aprobación

`accepted` — 2026-10-19.

---

### `T-POLISH-001` · P5 · `accepted`

Estado: **`accepted`** (humano, chat Cursor 2026-10-19).  
Aceptación basada en auditoría de código, tests y typecheck. **No** se afirma validación de un MP4 real con voz no-mock ni inspección auditiva del resultado.

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

- [x] Beat logic-lateral intacto; sin formatos nuevos.
- [x] SFX siguen siendo procedurales (`sfx:generate`); volumen/timing/cues pulidos en el formato de referencia; sin packs externos.
- [x] Biblioteca BGM = 3–8 pistas **o** menos si aún no hay suficientes con licencia verificable; cada pista incluida tiene fuente/licencia/condiciones/atribución documentadas; ninguna pista no verificable entra en el picker. *(entregado con 0 pistas curadas; limitación documentada)*
- [x] Thumbnail Satori mejora tipografía/contraste/badge/hook; sin sistema multi-plantilla por familia.
- [x] Tras voz no-mock, existe narración normalizada y el **render del MP4** usa ese audio (no solo un sidecar post-hoc). *(demostrado por provenance + tests; sin MP4 no-mock auditado en aceptación)*
- [x] Audio mock sigue etiquetado (`isTestAudio` / banner / warnings); loudnorm no se presenta como narración final en mock.
- [x] QC/report refleja checks relevantes (BGM curada / ausencia documentada; thumbnail; audio normalizado usado en render cuando aplica). *(gate `T-QC-LOUDNORM-001` incluido)*
- [x] `npm test` y `npm run typecheck` pasan.
- [x] Docs de uso actualizados; decisión registrada en `docs/DECISIONS.md` (D009 + D010).
- [x] Aceptación humana 2026-10-19 con limitación audiovisual documentada. Sin YouTube publish.

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

`accepted` — 2026-10-19 (humano, chat Cursor). P5 → `accepted` en el mismo acto.

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

#### Remediación auditoría loudnorm (2026-10-19, chat Cursor)

Hallazgo: `post_process` podía crear `narration-loudnorm.wav` **después** del MP4; el QC solo comprobaba existencia/selección actual → falso positivo.

- **Orden corregido:** voice (loudnorm) → render (`selectNarrationSourceForRender` + `publishNarrationAudio` + `render-narration.json` provenance) → post (**sin** generar loudnorm) → QC (`evaluateNarrationLoudnormQc` por provenance).
- **QC:** `verified_provenance` / `unverified` / `failed` / `mock_omitted`; no declara contenido MP4 re-extraído.
- **Tests:** post-render case, selección de audio, publish bytes = loudnorm.
- **Docs:** enmienda D009; `docs/tooling.md` / `docs/generar-short.md`.
- **Comandos (remediación):** `npm test` → 15 files / **60** tests passed · `npm run typecheck` OK.
- **Nota:** la remediación quedó cubierta también por `T-QC-LOUDNORM-001` (`accepted`).

#### Evidencias de aceptación (2026-10-19)

- Aceptado por: humano (chat Cursor).
- Base: auditoría de código, tests y typecheck (incl. suite posterior con gate QC; p. ej. 72 tests en cierre de `T-QC-LOUDNORM-001`).
- **Limitación audiovisual (explícita):** no se afirma que se haya validado un MP4 real con voz no-mock ni que se haya inspeccionado auditivamente el resultado; tampoco re-extracción del audio del contenedor MP4.
- Otras limitaciones conservadas: BGM curado = 0 pistas; sin TTS/pago en la entrega.
- Gate relacionado: `T-QC-LOUDNORM-001` ya `accepted`.
- Sin commit/push/merge/publicación en este cierre documental.
- **Siguiente (proposed):** P6 u otra tarea según humano; requiere nuevo `approved`.
