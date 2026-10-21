# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-CHATTERBOX-002`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no inicia YouTube; no altera P0–P7 `accepted`)

## Estado de aprobación

`accepted` (**solo fase 1**, con reservas) · fase 2 **no autorizada**

> Aceptación humana acotada 2026-10-21 (chat Cursor): fase 1 CLI Python aislado + docs + pins + tests sintéticos → **`accepted` con reservas** (equivalente de proyecto; no existe `accepted_with_reservations` en el esquema oficial).  
> Reservas vigentes (no son verificaciones superadas): **I-R1–I-R4**, **M-R1–M-R5**.  
> **No** se realizó inferencia real en la remediación. Pendiente manual: checkpoints, `conds.pt`, MPS real, watermark Perth.  
> **Fase 2 / Node / pipeline / QC / caché / elegibilidad: no autorizados.**  
> P0–P7 `accepted`. `T-AV-QC-001` `accepted`. P8 `blocked`.  
> `T-CHATTERBOX-001` intacto (`proposed`).

## Objetivo

Registrar el cierre documental de la fase 1 remediada (CLI aislado) tras decisión humana de aceptación con reservas — **sin** iniciar fase 2 ni tocar código.

## Alcance (sí — registro de aceptación fase 1)

1. Gobernanza: `tasks/active.md`, `tasks/approvals.md`, `ROADMAP.md` — aceptación acotada + trazabilidad de reservas.
2. Conservar historial de remediación B1–B2 / I1–I6 / M1–M8 y evidencias previas.
3. Mantener explícito: sin inferencia real; reservas I-R*/M-R* abiertas; fase 2 no autorizada.

## Fuera de alcance (no)

- Modificar `tools/chatterbox/synthesize.py`, tests u otro código.
- Fase 2: provider Node, factory, env, caché, QC, elegibilidad, orden pipeline.
- Instalar deps, descargar pesos, inferencia real.
- Commit / push / merge / publicar.
- Presentar reservas como verificaciones superadas.

## Archivos afectados previstos

| Path | Rol |
| --- | --- |
| `tasks/active.md`, `tasks/approvals.md`, `ROADMAP.md` | Solo registro de aceptación acotada |

## Dependencias

- Remediación fase 1 entregada + revisión independiente (I-R*/M-R*).
- Decisión humana 2026-10-21: aceptar fase 1 con reservas.
- P8 `blocked`.

## Criterios de aceptación

- [x] B1: no overwrite silencioso; protección `--ref`; atomic write; tests de integridad.
- [x] B2: rechazo NaN/+Inf/-Inf con error claro + tests.
- [x] I1–I6 remedados o documentados según alcance.
- [x] M1–M8 abordados sin complejidad innecesaria.
- [x] Tests locales sin PyTorch/pesos/inferencia ejecutados.
- [x] Humano acepta **fase 1** con reservas (2026-10-21) — ver `tasks/approvals.md`.
- [ ] Reservas I-R1–I-R4 / M-R1–M-R5: **abiertas** (no verificadas como resueltas).
- [ ] Manual pendiente: checkpoints, `conds.pt`, MPS real, watermark Perth.
- [ ] Fase 2: **no autorizada** (espera instrucción humana).

## Pruebas a ejecutar

```bash
cd tools/chatterbox && python3.11 -m unittest test_synthesize -v
```

*(Ya corridas en remediación/revisión; esta operación de gobernanza no re-ejecuta ni afirma inferencia.)*

## Riesgos y pendientes

- **Sin inferencia real** en remediación ni en este registro.
- Reservas abiertas: I-R1 (WAV huérfano si falla meta), I-R2 (parche MPS amplio), I-R3 (meta mezcla piloto/runtime), I-R4 (cleanup temp poco testeado); M-R1–M-R5 (gaps tests/docs/tipado).
- Manual pendiente: checkpoints, `conds.pt`, MPS real, watermark Perth.
- Fase 2 no iniciada / no autorizada.
- Cold start × N segmentos documentado en diseño; sin daemon.

## Notas

- Estado oficial usado: `accepted` + reservas explícitas (patrón P5/P7 con limitaciones). No se inventó un estado nuevo en el esquema.
- Detalle y tablas I-R*/M-R*: `tasks/approvals.md` § `T-CHATTERBOX-002`.
- Esperando nuevas instrucciones humanas; **no** iniciar fase 2.
