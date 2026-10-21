# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-002`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no inicia YouTube; no altera P0–P7 `accepted`)

## Estado de aprobación

`review_required` (**fase 2A** implementada) · fases 2B/2C **no iniciadas** · fase 1 permanece `accepted` (con reservas)

> Autorización humana 2026-10-21 (chat Cursor): **solo fase 2A** — provider Node.js + factoría + configuración + tests deterministas (sin pesos, sin inferencia real, sin red).  
> **No** autorizado: 2B (caché/hashes), 2C, pipeline, QC, elegibilidad, commit/push/merge, P8.  
> Fase 1: `accepted` con reservas I-R1–I-R4 / M-R1–M-R5 (intactas). Smoke MPS documentado.  
> P0–P7 `accepted`. `T-AV-QC-001` `accepted`. P8 `blocked`.  
> `T-CHATTERBOX-001` intacto (`proposed`).

## Objetivo

Integrar Chatterbox como `VoiceProvider` a nivel de arquitectura (fase 2A): invocación segura del CLI Python existente vía proceso hijo one-shot, registro en la factoría y configuración validada — sin alterar el comportamiento de los demás providers ni el pipeline.

## Alcance (sí — fase 2A)

1. Provider Node (`src/shorts/voice/chatterbox.ts`) que spawnea `tools/chatterbox/synthesize.py` con argv separados (sin shell).
2. Registro en `createVoiceProvider` como `chatterbox`; default y demás providers intactos; config inválida → error (no mock silencioso).
3. Variables `CHATTERBOX_*` en `env.ts` + placeholders en `.env.example` / nota en `docs/voice.md`.
4. Timeout dedicado `CHATTERBOX_TIMEOUT_MS` (default 300000).
5. Éxito solo con exit 0 + WAV PCM16 mono 24 kHz válido + metadatos válidos de esta ejecución (I-R1: WAV huérfano ≠ éxito).
6. Tests unitarios deterministas con spawn simulado (sin red, pesos ni inferencia).

## Fuera de alcance (no)

- Fase 2B: clave de caché, hashes de ref/pesos, manifiestos.
- Fase 2C / pipeline / loudnorm / render / post / QC / `verified_provenance` / elegibilidad.
- Inferencia real desde Node; descargas de modelos; install de deps.
- Commit / push / merge / publicar / P8 / YouTube.
- Modificar CLI Python, HelloRemotion/ScriptVideo, CI.
- Marcar la tarea o la fase 2 como `accepted`.

## Archivos afectados previstos

| Path | Rol |
| --- | --- |
| `src/shorts/voice/chatterbox.ts` | Provider Node + validación WAV/meta + spawn |
| `src/shorts/voice/provider.ts` | `case 'chatterbox'` en factoría |
| `src/shorts/config/env.ts` | `VoiceProviderName` + `CHATTERBOX_*` |
| `.env.example`, `docs/voice.md` | Placeholders / docs seguros |
| `tests/unit/voice-chatterbox.test.ts` | Suite determinista |
| `tasks/active.md`, `tasks/approvals.md`, `ROADMAP.md` | Gobernanza 2A |

## Dependencias

- Fase 1 `accepted` con reservas (2026-10-21).
- Autorización humana 2026-10-21: **solo fase 2A**.
- CLI real: `tools/chatterbox/synthesize.py` (contrato `--text/--output/--ref/--ckpt-dir/--device/--meta-out/...`).
- P8 `blocked`.

## Criterios de aceptación

- [x] Provider cumple contrato `VoiceProvider` / `VoiceResult`.
- [x] Factoría registra `chatterbox`; default y providers existentes sin cambio de comportamiento.
- [x] Config obligatoria validada solo al seleccionar Chatterbox; sin fallback silencioso a mock.
- [x] Spawn argv-safe; timeout dedicado 300000; errores spawn/timeout/exit/artefactos gestionados.
- [x] Éxito = exit 0 + WAV válido + meta válida de esta ejecución.
- [x] Tests deterministas sin inferencia/red/pesos.
- [ ] Revisión humana de fase 2A (pendiente) — **no** `accepted` automático.
- [ ] Fases 2B/2C: **no iniciadas**.

## Pruebas a ejecutar

```bash
npm test -- tests/unit/voice-chatterbox.test.ts tests/unit/voice.test.ts
npm test
npm run typecheck
```

## Riesgos y pendientes

- Reservas fase 1 abiertas (I-R1–I-R4, M-R1–M-R5); 2A respeta I-R1 (no aceptar WAV sin meta).
- Inferencia real Node / pipeline / caché = fases posteriores.
- `conds.pt` / auditoría Perth siguen pendientes (fase 1).
- Cold start × N segmentos; sin daemon (política conservada).

## Notas

- Estado tras implementación agente: `review_required` (fase 2A). Esperando humano.
- Siguiente propuesta: fase 2B (caché SHA-256 ref + runtime pin) en `proposed` tras aceptación 2A.
