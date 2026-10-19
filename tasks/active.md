# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-AV-QC-001`
- **Fase ROADMAP:** transversal post-P7 / pre-P8 (**no** es P8; no inicia YouTube)

## Estado de aprobación

`accepted`

> Aceptado 2026-10-19 por humano (chat Cursor) tras revisión de los cuatro MP4.  
> P0–P7 `accepted`. `T-AV-QC-001` `accepted`. P8 `blocked`. Sin YouTube. Sin commit/push/merge en este acto.

## Objetivo

Renderizar e inspeccionar vídeos reales de las cuatro familias (`logic-lateral`, `math`, `memory`, `illusion`) antes de considerar publicación.

## Alcance entregado

1. Topics de evidencia `data/topics/av-qc-*.json` (copias; templates intactos).
2. Cuatro jobs con OpenAI Cedar + loudnorm verificado + QC `report.ok=true`.
3. Frames, `docs/av-qc.md`, D016; allowlist `cedar`.
4. Illusion permanece `partial`. P8 no iniciado.

## Criterios de aceptación

- [x] Un MP4 real por familia.
- [x] Renders `completed` + `report.json` revisado.
- [x] QC técnico OK (warning BGM vacío esperado).
- [x] Inspección audiovisual humana de los cuatro vídeos.
- [x] Evidencias en `tasks/approvals.md`.
- [x] Defectos/limitaciones documentados.
- [x] Humano marca `accepted` (2026-10-19, chat Cursor).

## Pruebas de aceptación

```bash
npm test          # 21 files / 102 tests passed
npm run typecheck # OK
# Renders: output/av-qc-{logic-lateral,math,memory,illusion}/video.mp4 (Cedar)
```

## Limitaciones conservadas

- BGM vacío (sin validación de mezcla).
- Placeholders en plantilla logic-lateral; typo memory «RECORDISTE»; stack math repetido.
- `eligible=true` ≠ permiso de publicar; P8 `blocked`.

## Notas

- Sin tarea de implementación siguiente autorizada.
- Posibles follow-ups en `proposed` (humano): tipografía memory; curación BGM; P8 solo con nueva decisión.
