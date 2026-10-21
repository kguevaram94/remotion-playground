# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-002`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no inicia YouTube; no altera P0–P7 `accepted`)

## Estado de aprobación

`accepted` (**fase 2A**, con reserva técnica) · fases 2B/2C **no autorizadas** · fase 1 permanece `accepted` (con reservas I-R*/M-R*)

> Aceptación humana 2026-10-21 (chat Cursor): **fase 2A** — provider Node.js + factoría + configuración + corrección anti-reuso.  
> Estado registrado: **`accepted` (con reserva técnica)** — el esquema no admite `accepted_with_reservation`.  
> Reserva 2A: detección `exists`/`size`/`mtimeMs` es práctica, **no** garantía criptográfica de identidad de audio.  
> **No** autorizado: 2B (caché/hashes), 2C, pipeline, QC, elegibilidad, commit/push/merge/rebase, P8.  
> Fase 1: `accepted` con reservas I-R1–I-R4 / M-R1–M-R5 (**intactas / abiertas**). Smoke MPS documentado.  
> P0–P7 `accepted`. `T-AV-QC-001` `accepted`. P8 `blocked`.  
> `T-CHATTERBOX-001` intacto (`proposed`).

## Objetivo

Integrar Chatterbox como `VoiceProvider` a nivel de arquitectura (fase 2A): invocación segura del CLI Python existente vía proceso hijo one-shot, registro en la factoría y configuración validada — sin alterar el comportamiento de los demás providers ni el pipeline.

## Alcance (sí — fase 2A; aceptado)

1. Provider Node (`src/shorts/voice/chatterbox.ts`) que spawnea `tools/chatterbox/synthesize.py` con argv separados (sin shell).
2. Registro en `createVoiceProvider` como `chatterbox`; default y demás providers intactos; config inválida → error (no mock silencioso).
3. Variables `CHATTERBOX_*` en `env.ts` + placeholders en `.env.example` / nota en `docs/voice.md`.
4. Timeout dedicado `CHATTERBOX_TIMEOUT_MS` (default 300000).
5. Éxito solo con exit 0 + WAV PCM16 mono 24 kHz válido + metadatos válidos de esta ejecución (I-R1: WAV huérfano ≠ éxito).
6. Tests unitarios deterministas con spawn simulado (sin red, pesos ni inferencia).
7. Corrección anti-reuso asociada (detección práctica de artefactos no actualizados).

## Fuera de alcance (no — sigue vigente)

- Fase 2B: clave de caché, hashes de ref/pesos, manifiestos (**no autorizada**).
- Fase 2C / pipeline / loudnorm / render / post / QC / `verified_provenance` / elegibilidad (**no autorizada**).
- Inferencia real desde Node; descargas de modelos; install de deps.
- Commit / push / merge / rebase / publicar / P8 / YouTube.
- Modificar CLI Python, HelloRemotion/ScriptVideo, CI (salvo lo ya entregado en 2A).
- Cerrar reservas I-R*/M-R* de fase 1 ni afirmar procedencia verificada.

## Archivos afectados (fase 2A entregada)

| Path | Rol |
| --- | --- |
| `src/shorts/voice/chatterbox.ts` | Provider Node + validación WAV/meta + spawn + anti-reuso |
| `src/shorts/voice/provider.ts` | `case 'chatterbox'` en factoría |
| `src/shorts/config/env.ts` | `VoiceProviderName` + `CHATTERBOX_*` |
| `.env.example`, `docs/voice.md` | Placeholders / docs seguros |
| `tests/unit/voice-chatterbox.test.ts` | Suite determinista |
| `tasks/active.md`, `tasks/approvals.md`, `ROADMAP.md` | Gobernanza 2A |

## Dependencias

- Fase 1 `accepted` con reservas (2026-10-21).
- Aceptación humana 2026-10-21: **fase 2A** con reserva técnica.
- CLI real: `tools/chatterbox/synthesize.py` (contrato `--text/--output/--ref/--ckpt-dir/--device/--meta-out/...`).
- P8 `blocked`.

## Criterios de aceptación

- [x] Provider cumple contrato `VoiceProvider` / `VoiceResult`.
- [x] Factoría registra `chatterbox`; default y providers existentes sin cambio de comportamiento.
- [x] Config obligatoria validada solo al seleccionar Chatterbox; sin fallback silencioso a mock.
- [x] Spawn argv-safe; timeout dedicado 300000; errores spawn/timeout/exit/artefactos gestionados.
- [x] Éxito = exit 0 + WAV válido + meta válida de esta ejecución.
- [x] Tests deterministas sin inferencia/red/pesos.
- [x] Revisión humana de fase 2A — **`accepted` con reserva técnica** (2026-10-21).
- [ ] Fases 2B/2C: **no autorizadas / no iniciadas**.

## Pruebas a ejecutar

```bash
npm test -- tests/unit/voice-chatterbox.test.ts tests/unit/voice.test.ts
npm test
npm run typecheck
```

> Nota de aceptación 2A: la revisión final humana verificó 21 pruebas específicas + typecheck; la suite completa **no** se registró como verificada en esa última comprobación.

## Riesgos y pendientes

- **Reserva técnica 2A (abierta):** `exists`/`size`/`mtimeMs` ≠ prueba criptográfica de identidad de contenido; no equivale a nonce / run-id / hash.
- Reservas fase 1 abiertas (I-R1–I-R4, M-R1–M-R5); 2A respeta I-R1 (no aceptar WAV sin meta).
- Inferencia real Node / pipeline / caché = fases posteriores (**no autorizadas**).
- `conds.pt` / auditoría Perth siguen pendientes (fase 1).
- Cold start × N segmentos; sin daemon (política conservada).

## Notas

- Estado tras aceptación humana: fase 2A **`accepted` (con reserva técnica)**.
- Siguiente propuesta: fase 2B (caché SHA-256 ref + runtime pin) en **`proposed`** — **espera nuevo `approved` humano**; **no** iniciar.
