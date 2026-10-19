# Remotion Playground + fábrica de Shorts

Playground Remotion y **fábrica automatizada de YouTube Shorts** (acertijos, lógica, ilusiones, memoria).

## Empezar

```bash
npm install
cp .env.example .env   # OPENAI_API_KEY + VOICE_PROVIDER=openai-tts
npm run sfx:generate

# Formato oficial logic-lateral (recomendado):
cp data/templates/script-logic-lateral.json data/topics/mi-reto.json
# …edita id, title, narrations…
npm run generar-short -- --input data/topics/mi-reto.json
```

Salida en `output/<id>/video.mp4` (guion, voz, karaoke, música, SFX, thumbnail).

Referencia: `output/s4-19-interruptores/video.mp4`. Procedimiento: [docs/generar-short.md](docs/generar-short.md).

## Comandos

| Comando | Descripción |
| --- | --- |
| `npm run generar-short -- --input data/templates/script-logic-lateral.json` | Short logic-lateral (recomendado) |
| `npm run generar-short -- "título"` | Short desde título (detección de plantilla) |
| `npm run generar-short -- --input data/topics/….json` | Desde topic o guion propio |
| `npm run short -- "título"` | Pipeline completo (mismo motor) |
| `npm run short:script -- "título"` | Solo guion |
| `npm run short:render -- --id <id>` | Re-render |
| `npm run short:voice -- --id <id>` | Regenerar voz + subtítulos + vídeo |
| `npm run short:preview -- --id <id>` | Preview a menor resolución |
| `npm run short:resume -- --id <id>` | Reanudar fases pendientes |
| `npm run short:validate -- --id <id>` | Validar acertijo |
| `npm run dev` | Remotion Studio |
| `npm test` | Pruebas |
| `npm run typecheck` | TypeScript |

Docs: [generar-short](docs/generar-short.md) · [usage](docs/usage.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [DECISIONS](docs/DECISIONS.md) · [ROADMAP](ROADMAP.md) · [troubleshooting](docs/troubleshooting.md) · [AGENTS.md](AGENTS.md) · [tarea activa](tasks/active.md) · [aprobaciones](tasks/approvals.md)

**Colaboración:** ChatGPT (plan/revisión) · Cursor (implementación) · GitHub (fuente de verdad). Protocolo y estados en [AGENTS.md](AGENTS.md); no sincroniza chats automáticamente.

## Composiciones Remotion

| ID | Descripción |
| --- | --- |
| `HelloRemotion` | Demo 16:9 |
| `ScriptVideo` | Infografía vertical existente |
| `ShortVideo` | Shorts de acertijos (fábrica) |

## FFmpeg (opcional, QC)

```bash
brew install ffmpeg
```
