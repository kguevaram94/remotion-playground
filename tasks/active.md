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
> Smoke test real autorizado y ejecutado 2026-10-21 (macOS Apple Silicon, CLI aislado): exit 0; MPS real sin fallback CPU; artefactos **fuera** del repo. Detalle en `tasks/approvals.md`.  
> Pendiente manual aún abierto: `conds.pt` (ausente; conditionals no ejercitado), auditoría watermark Perth (sigue `left_intact` ≠ verificación).  
> **Fase 2 / Node / pipeline / QC / caché / elegibilidad: no autorizados.**  
> P0–P7 `accepted`. `T-AV-QC-001` `accepted`. P8 `blocked`.  
> `T-CHATTERBOX-001` intacto (`proposed`).

## Objetivo

Registrar evidencia documental del smoke test real de fase 1 (CLI aislado) en macOS Apple Silicon — **sin** iniciar fase 2 ni tocar código.

## Alcance (sí — registro de evidencia smoke fase 1)

1. Gobernanza: `tasks/active.md`, `tasks/approvals.md`, `ROADMAP.md` — hechos observados del smoke + trazabilidad de reservas aún abiertas.
2. Conservar historial de aceptación acotada, remediación B1–B2 / I1–I6 / M1–M8 y evidencias previas.
3. Mantener explícito: fase 2 no autorizada; `conds.pt` / Perth no validados como cerrados; sin integración Node/pipeline.

## Fuera de alcance (no)

- Modificar `tools/chatterbox/synthesize.py`, tests u otro código.
- Fase 2: provider Node, factory, env, caché, QC, elegibilidad, orden pipeline.
- Instalar deps, descargar pesos, nueva inferencia.
- Commit / push / merge / publicar.
- Copiar referencia vocal ni WAV generados al repositorio.
- Presentar reservas I-R*/M-R* ni Perth/`conds.pt` como verificaciones superadas.
- Afirmar integración Node/pipeline.

## Archivos afectados previstos

| Path | Rol |
| --- | --- |
| `tasks/active.md`, `tasks/approvals.md`, `ROADMAP.md` | Solo registro documental del smoke |

## Dependencias

- Fase 1 `accepted` con reservas (2026-10-21).
- Autorización humana 2026-10-21: smoke test real controlado del CLI (sin fase 2, sin cambios de código).
- P8 `blocked`.

## Criterios de aceptación

- [x] B1: no overwrite silencioso; protección `--ref`; atomic write; tests de integridad.
- [x] B2: rechazo NaN/+Inf/-Inf con error claro + tests.
- [x] I1–I6 remedados o documentados según alcance.
- [x] M1–M8 abordados sin complejidad innecesaria.
- [x] Tests locales sin PyTorch/pesos/inferencia ejecutados.
- [x] Humano acepta **fase 1** con reservas (2026-10-21) — ver `tasks/approvals.md`.
- [x] Smoke real 2026-10-21: inferencia CLI exit 0 en MPS; pins observados; WAV PCM16 mono 24 kHz (detalle en approvals) — **sin** copiar artefactos al repo.
- [ ] Reservas I-R1–I-R4 / M-R1–M-R5: **abiertas** (no verificadas como resueltas).
- [ ] Manual pendiente: `conds.pt` (no presente; conditionals sin verificar), watermark Perth (política `left_intact` ≠ auditoría).
- [ ] Fase 2: **no autorizada** (espera instrucción humana).

## Pruebas a ejecutar

```bash
cd tools/chatterbox && python3.11 -m unittest test_synthesize -v
```

*(Suite sintética ya corrida en remediación/revisión.)*

Smoke real (autorizado 2026-10-21; una sola frase; `--device mps`; sin `--force`; sin instalar/descargar): ejecutado — ver `tasks/approvals.md` § evidencia smoke. Artefactos fuera de Git.

## Riesgos y pendientes

- Reservas abiertas: I-R1 (WAV huérfano si falla meta), I-R2 (parche MPS amplio), I-R3 (meta mezcla piloto/runtime), I-R4 (cleanup temp poco testeado); M-R1–M-R5 (gaps tests/docs/tipado).
- `conds.pt` ausente en el smoke → `Conditionals.load` **no** ejercitado / **no** validado.
- Perth: solo política documentada `left_intact`; **sin** auditoría del watermark.
- Fase 2 no iniciada / no autorizada.
- Cold start × N segmentos documentado en diseño; sin daemon.

## Notas

- Estado oficial usado: `accepted` + reservas explícitas (patrón P5/P7 con limitaciones). No se inventó un estado nuevo en el esquema.
- Detalle y tablas I-R*/M-R* + evidencia smoke: `tasks/approvals.md` § `T-CHATTERBOX-002`.
- Esperando nuevas instrucciones humanas; **no** iniciar fase 2.
