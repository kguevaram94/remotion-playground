# Música de fondo (BGM) — política P5 / T-POLISH-001

## Regla

El pipeline **solo** usa pistas listadas en [`catalog.json`](./catalog.json) con licencia **verificable**.

Cualquier archivo MP3/WAV en esta carpeta que **no** figure en el catálogo queda **excluido** del picker (no se incrusta en shorts).

## Estado actual (2026-10-19)

| Campo | Valor |
| --- | --- |
| Pistas curadas | **0** |
| Objetivo | 3–8 pistas |
| Motivo | Los `outputNNN.mp3` existentes no tienen fuente/licencia documentada → excluidos |

Limitación documentada a propósito: es preferible renderizar **sin** BGM que publicar con audio de procedencia dudosa. No se compran ni descargan recursos de pago sin autorización humana.

## Cómo añadir una pista

1. Coloca el archivo en `songs/` (p. ej. `lofi-pulse.mp3`).
2. Añade una entrada en `catalog.json`:

```json
{
  "file": "lofi-pulse.mp3",
  "title": "Lofi Pulse",
  "source": "https://example.com/track",
  "license": "CC0-1.0",
  "licenseUrl": "https://creativecommons.org/publicdomain/zero/1.0/",
  "attribution": "Opcional según la licencia",
  "notes": "Uso comercial en YouTube Shorts permitido"
}
```

3. Campos **obligatorios:** `file`, `source`, `license`.
4. Verifica que el archivo existe y que la licencia permite uso en vídeos (idealmente sin claim de Content ID).
5. Corre `npm test` (suite `bg-music`).

## Archivos presentes pero excluidos

Los `output000.mp3` … `output029.mp3` permanecen en disco por ahora pero **no** entran en el catálogo hasta que alguien documente fuente y licencia verificables (o los sustituya por assets claros). Pueden borrarse o moverse en una tarea futura con OK humano.

## Atribución

Si una licencia exige crédito, anótalo en `attribution` y refleja el texto en la ficha del short / descripción de YouTube (fuera del alcance de P5: no hay upload automático).
