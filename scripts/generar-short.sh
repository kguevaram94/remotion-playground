#!/usr/bin/env bash
# Genera un YouTube Short (formato logic-lateral: voz, música, SFX, karaoke).
#
# Uso:
#   ./scripts/generar-short.sh "Título del acertijo"
#   ./scripts/generar-short.sh --input data/templates/script-logic-lateral.json
#   ./scripts/generar-short.sh --input data/topics/s4-19-interruptores.json
#   ./scripts/generar-short.sh --id s4-19-interruptores --mode voice
#
# Ver docs/generar-short.md

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

red() { printf '\033[31m%s\033[0m\n' "$*" >&2; }
ok() { printf '\033[32m%s\033[0m\n' "$*"; }

if [[ ! -f .env ]]; then
  red "Falta .env — copia .env.example y configura OPENAI_API_KEY / VOICE_PROVIDER."
  exit 1
fi

if [[ ! -f public/sfx/tick.wav ]]; then
  echo "[generar-short] Generando SFX…"
  node scripts/generate-sfx.mjs
fi

if [[ ! -d songs ]] || [[ -z "$(find songs -maxdepth 1 -type f \( -name '*.mp3' -o -name '*.wav' \) 2>/dev/null | head -1)" ]]; then
  red "Aviso: no hay pistas en songs/ — el vídeo saldrá sin música de fondo."
fi

if [[ $# -eq 0 ]]; then
  cat <<'EOF'
Uso:
  npm run generar-short -- "Título del acertijo"
  npm run generar-short -- --input data/templates/script-logic-lateral.json
  npm run generar-short -- --input data/topics/s4-19-interruptores.json
  npm run generar-short -- --id <id> --mode voice

Plantilla oficial: data/templates/script-logic-lateral.json
Documentación: docs/generar-short.md
EOF
  exit 1
fi

echo "[generar-short] Ejecutando pipeline…"
npm run short -- "$@"
ok "[generar-short] Listo. Revisa output/<id>/video.mp4"
