# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `T-POLISH-001`
- **Fase ROADMAP:** `P5`

## Estado de aprobación

`review_required`

> Implementación lista. Esperando revisión humana. **No** marcar `accepted` el agente.

## Objetivo

Elevar la calidad de producción del short logic-lateral: SFX procedural, BGM con licencias verificables, thumbnail Satori pulido, narración loudnorm usada en el MP4 final — sin cambiar el beat oficial.

## Alcance

Completado según gates aprobados (SFX=A, BGM=B, Thumbnail=A, Loudnorm=B). Detalle en `tasks/approvals.md`.

## Fuera de alcance

Respetado: sin formatos nuevos, sin mix loudnorm, sin YouTube, sin packs SFX, sin deps nuevas, sin compra de assets.

## Archivos afectados previstos

Ver informe en `tasks/approvals.md` / diff local.

## Dependencias

- P0–P4: `accepted`
- Aprobación humana: 2026-10-19

## Criterios de aceptación

Checklist en `tasks/approvals.md` — pendiente verificación humana.

## Pruebas que deben ejecutarse

```bash
npm test
npm run typecheck
```

Ejecutados 2026-10-19: **50 tests OK**, typecheck OK. `npm run sfx:generate` OK.

## Riesgos y cuestiones pendientes

- Catálogo BGM con **0** pistas curadas (limitación documentada en `songs/README.md`).
- No se ejecutó render completo con TTS de pago (no autorizado en esta entrega).
- Entrega en `review_required` hasta OK humano.

## Notas de progreso

- Etapas: BGM catálogo → SFX → thumbnail → loudnorm→render → QC/docs → tests.
- Sin commit/push/merge.
