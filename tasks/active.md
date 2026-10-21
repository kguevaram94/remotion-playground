# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-002`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no inicia YouTube; no altera P0–P7 `accepted`)

## Estado de aprobación

`accepted` (**fase 2B** con limitaciones explícitas; hallazgos #4/#9 cerrados) · fase 2C **no autorizada / no iniciada** · fase 2A permanece `accepted` (con reserva técnica) · fase 1 permanece `accepted` (con reservas I-R*/M-R*)

> Aceptación humana 2026-10-21 (chat Cursor): **fase 2B** — identidad de caché Chatterbox (`accepted` + limitaciones; esquema sin `accepted_with_reservation`).  
> Base: auditoría final (hallazgos **#4** / **#9** PASS; `npm test` 141; `npm run typecheck` OK; entrega `c119717`).  
> **No** autorizado: 2C, QC, `verified_provenance`, pipeline render/post, inferencia real, descargas, commit/push/merge/rebase, P8.  
> Fase 2A: `accepted` con reserva técnica (`exists`/`size`/`mtimeMs`) — **abierta / intacta**.  
> Fase 1: `accepted` con reservas I-R1–I-R4 / M-R1–M-R5 (**abiertas**).  
> P0–P7 `accepted`. `T-AV-QC-001` `accepted`. P8 `blocked`.  
> `T-CHATTERBOX-001` intacto (`proposed`).

## Objetivo

Ampliar la clave de caché de narración **solo para Chatterbox** con identidad de contenido de la referencia vocal (SHA-256), huella reproducible de los pins **declarados** en `requirements-pin.txt`, y parámetros de síntesis del contrato del provider — sin cambiar claves de otros providers ni afirmar procedencia verificada.

## Alcance (sí — fase 2B)

1. SHA-256 del contenido de `CHATTERBOX_REF_WAV` (streaming por bloques; no ruta/mtime).
2. Huella de pins declarados (`requirements-pin.txt` junto al CLI): normalización canónica + SHA-256.
3. Inclusión de params relevantes (modelId, device, languageId, exaggeration, cfgWeight, temperature).
4. Fallo explícito si no se puede leer la ref o los pins (sin reuso silencioso de caché).
5. Cableado en `generate-voice.ts` solo cuando `voiceProvider === 'chatterbox'`.
6. Tests deterministas offline con fixtures sintéticas.
7. Docs mínimas (`docs/voice.md`) + gobernanza.

## Fuera de alcance (no)

- Fase 2C / loudnorm / render / post / QC / elegibilidad / `verified_provenance`.
- Inferencia real; descargas; install; daemon.
- Comprobar paquetes instalados en el venv (pins = declarados, no runtime live).
- Hash de checkpoints / manifiesto de pesos en disco.
- Modificar fase 2A anti-reuso ni cerrar su reserva técnica.
- Cerrar reservas I-R*/M-R* de fase 1.
- Commit / push / merge / rebase / P8 / YouTube.

## Archivos afectados previstos

| Path | Rol |
| --- | --- |
| `src/shorts/voice/chatterbox-cache.ts` | Helpers identidad caché (nuevo) |
| `src/shorts/pipeline/generate-voice.ts` | Clave Chatterbox-only |
| `tests/unit/voice-chatterbox-cache.test.ts` | Suite 2B |
| `docs/voice.md` | Nota caché 2B |
| `tasks/active.md`, `tasks/approvals.md`, `ROADMAP.md` | Gobernanza |

## Dependencias

- Fase 2A `accepted` con reserva técnica (2026-10-21).
- Autorización humana 2026-10-21: **fase 2B**.
- `tools/chatterbox/requirements-pin.txt` (pins declarados en repo).
- P8 `blocked`.

## Criterios de aceptación

- [x] Misma ref (bytes) → mismo hash; paths distintos con mismos bytes → misma identidad.
- [x] Cambio de bytes de ref o de pins declarados invalida la clave Chatterbox.
- [x] Cambio de params de síntesis relevantes invalida la clave.
- [x] Error al leer ref/pins → fallo explícito (no reuso silencioso).
- [x] Otros providers conservan comportamiento de clave.
- [x] Serialización determinista; sin red/pesos/inferencia en tests.
- [x] Limitación documentada: pins declarados ≠ prueba de paquetes instalados.
- [x] Revisión humana de fase 2B — `accepted` (con limitaciones; 2026-10-21).
- [ ] Fase 2C: **no autorizada / no iniciada**.

## Pruebas a ejecutar

```bash
npm test -- tests/unit/voice-chatterbox-cache.test.ts tests/unit/generate-voice-chatterbox-cache.test.ts tests/unit/voice-chatterbox.test.ts tests/unit/voice.test.ts
npm test
npm run typecheck
```

## Riesgos y pendientes

- **Pins declarados ≠ runtime instalado:** la huella no consulta el intérprete ni `pip freeze`.
- **Sin hash de checkpoints:** cambiar pesos en `CHATTERBOX_CKPT_DIR` sin tocar pins/ref/params no invalida la clave.
- Reserva técnica 2A (`size`/`mtimeMs`) sigue abierta.
- Reservas fase 1 I-R*/M-R* abiertas; 2B **no** afirma `verified_provenance`.
- Hash de ref identifica contenido de referencia para distinguir caché; **no** prueba procedencia del audio final.

## Notas

- Estado tras aceptación humana: fase 2B **`accepted` (con limitaciones)**. Hallazgos #4/#9 cerrados. **No** `verified_provenance`.
- Reservas fase 1 I-R*/M-R* y reserva técnica 2A **siguen abiertas**.
- Siguiente propuesta: fase 2C (pipeline/QC) en `proposed` — **requiere nuevo `approved`**; **no** iniciar.
