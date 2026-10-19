# Validación audiovisual (T-AV-QC-001)

Procedimiento reproducible para renderizar e inspeccionar un Short real por familia **antes** de cualquier publicación (P8).

## Capas (no confundir)

| Capa | Artefacto | Significado |
| --- | --- | --- |
| Schema / narrativa | `validation.json` | Beat + puzzle; `auto_validated` ≠ OK visual |
| QC técnico | `report.json` | MP4, loudnorm provenance, SFX, warnings |
| `publishEligibility` | dentro de `report.json` | Gate automático; **no** es inspección AV humana |
| Inspección AV | checklist humana + frames | Juicio visual/auditivo sobre el MP4 |
| Publicar | decisión humana (+ P8) | Fuera de esta tarea |

Illusion permanece `partial` / `pending_review` (nunca `auto_validated`).

## Familias y fixtures

| Familia | Topic de evidencia | Plantilla origen (no modificar) |
| --- | --- | --- |
| logic-lateral | `data/topics/av-qc-logic-lateral.json` | `data/templates/script-logic-lateral.json` |
| math | `data/topics/av-qc-math.json` | `data/templates/script-math.json` |
| memory | `data/topics/av-qc-memory.json` | `data/templates/script-memory.json` |
| illusion | `data/topics/av-qc-illusion.json` | `data/templates/script-illusion.json` |

## Render (pipeline existente)

```bash
# Voz autorizada en la corrida de evidencia: OpenAI Cedar
VOICE_PROVIDER=openai-tts VOICE_NAME=cedar \
  npm run generar-short -- --input data/topics/av-qc-logic-lateral.json
# repetir para av-qc-math | av-qc-memory | av-qc-illusion
```

Salida: `output/<id>/video.mp4`, `report.json`, `validation.json`, `thumbnail.png`, opcional `frames/`.

## Checklists

Ver `tasks/active.md` / evidencias en `tasks/approvals.md` (`T-AV-QC-001`).

## Relacionado

- [generar-short.md](generar-short.md) · [studio-preview.md](studio-preview.md) · [voice.md](voice.md)
- Decisión D016 en [DECISIONS.md](DECISIONS.md)
