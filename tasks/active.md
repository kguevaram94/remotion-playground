# Tarea activa

Solo puede haber **una** tarea activa. Si la petición del usuario no encaja, preguntar antes de cambiar este archivo.

Completar **todos** los campos del esquema. Estados: `proposed` | `approved` | `in_progress` | `review_required` | `accepted` | `blocked`.

---

## Identificador y fase

- **ID:** `ninguna`
- **Fase ROADMAP:** —

## Estado de aprobación

`proposed` (sin trabajo activo)

> P3 (`T-GOV-001`) y P4 (`T-CI-001`) quedaron `accepted` el 2026-10-19.  
> P5 (`T-POLISH-001`): alcance definitivo propuesto en `tasks/approvals.md` (gates SFX=A, BGM=B, thumb=A, loudnorm=B). Sigue `proposed`. **No implementar** hasta `approved` o autorización expresa en chat.

## Objetivo

—

## Alcance

—

## Fuera de alcance

Cualquier cambio de producto hasta nueva tarea aprobada.

## Archivos afectados previstos

—

## Dependencias

- P0–P4: `accepted`
- P5: `proposed` (ver `tasks/approvals.md`)

## Criterios de aceptación

—

## Pruebas que deben ejecutarse

—

## Riesgos y cuestiones pendientes

- Esperando aprobación humana del **alcance definitivo** de `T-POLISH-001` / P5 (u otra tarea).

## Notas de progreso

- Gobernanza (P3) y CI (P4) cerradas. Idle hasta el siguiente `approved`.
- Propuesta P5 actualizada con gates humanos; implementación no iniciada.
