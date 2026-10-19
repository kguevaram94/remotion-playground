# Plantillas

| Archivo | Familia | Uso |
| --- | --- | --- |
| `script-logic-lateral.json` | `logic-lateral` | Formato oficial de referencia (beat + CTA comentar) |
| `script-math.json` | `math` | Familia math (entrega B · T-MULTIFORMAT-001) |
| `script-memory.json` | `memory` | Familia memory (entrega C · T-MULTIFORMAT-001) |
| `script-illusion.json` | `illusion` | Familia illusion (entrega D · T-MULTIFORMAT-001); status `partial` |
| `script-plantilla.json` | varias | Guion genérico / variantes legacy (p. ej. nine-dots) |

Topic mínimo: `../topics/_plantilla.json` (solo título; el pipeline genera el guion).

```bash
cp data/templates/script-logic-lateral.json data/topics/mi-reto.json
# o
cp data/templates/script-math.json data/topics/mi-reto-math.json
# o
cp data/templates/script-memory.json data/topics/mi-reto-memory.json
# o
cp data/templates/script-illusion.json data/topics/mi-reto-illusion.json

npm run generar-short -- --input data/topics/mi-reto.json
```

Campo opcional `family`: si se omite, se infiere. Ver [docs/generar-short.md](../../docs/generar-short.md).
