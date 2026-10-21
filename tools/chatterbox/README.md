# Chatterbox CLI (fase 1 · `T-CHATTERBOX-002`)

CLI Python one-shot para generar narración con el pack **es-ES** de Chatterbox y emitir **PCM16 mono 24 kHz**, listo para el contrato de concat/loudnorm del repo.

Esta fase **no** cablea el provider Node ni el pipeline. No instala deps ni descarga pesos desde CI.

## Versiones del piloto (pinneadas)

| Componente | Versión |
| --- | --- |
| Python | **3.11.17** |
| PyTorch | **2.6.0** |
| torchaudio | **2.6.0** |
| chatterbox-tts | **0.1.7** |
| Modelo | `ResembleAI/Chatterbox-Multilingual-es-es` |

Ver también `requirements-pin.txt`. No afirmar compatibilidad fuera de este stack. `safetensors` llega como dependencia transitiva de `chatterbox-tts` (no pinneada aparte en fase 1).

Comprobar pins sin inferencia (comando verificado estáticamente; no descarga pesos):

```bash
python3.11 tools/chatterbox/synthesize.py --print-pins
```

## Instalación local (manual · fuera de Git)

Crear un venv **fuera** del tree (o gitignored). Ejemplo ilustrativo (ajustar paths locales):

```bash
python3.11 -m venv /path/to/chatterbox-venv
source /path/to/chatterbox-venv/bin/activate
pip install torch==2.6.0 torchaudio==2.6.0
pip install chatterbox-tts==0.1.7
# Descargar pesos es-es a un directorio local (HF), p. ej. ve.pt, t3_es_es.safetensors, s3gen_v3.pt, …
```

No commitear: venv, caché Hugging Face, pesos (`.pt` / `.safetensors`), ni WAV de referencia/salida.

## Loader custom `es-es`

El pack Single Language no usa el `from_local` genérico de Multilingual V3. El CLI porta el loader del piloto.

### Hechos verificados (piloto · stack pinneado)

| Asset | Carga | Nota |
| --- | --- | --- |
| `ve.pt` | `torch.load(..., weights_only=True)` | Piloto OK en stack pinneado |
| `s3gen_v3.pt` | `torch.load(..., weights_only=True)` + `load_state_dict(..., strict=False)` | Piloto OK; missing esperados abajo |
| `t3_es_es.safetensors` | `safetensors.torch.load_file` | No usa `torch.load` |
| `grapheme_mtl_merged_expanded_v1.json` | MTLTokenizer | Requerido |

### Hipótesis / pendientes (no afirmar como hechos)

| Asset / tema | Estado |
| --- | --- |
| `conds.pt` vía `Conditionals.load` | **No verificado** en este entorno CLI; si el archivo existe se intenta cargar y se anota en meta. Compatibilidad real con `weights_only` / este stack = **pendiente de smoke manual autorizado**. |
| Que futuros `.pt` del pack sigan siendo tensores puros con `weights_only=True` | Hipótesis; no se reduce seguridad ni se cambia el método de carga para ocultar incompatibilidades. |

### `strict=False`

Con `chatterbox-tts==0.1.7`, `s3gen_v3.pt` deja claves esperadas en missing (piloto):

- `tokenizer._mel_filters`
- `tokenizer.window`

`strict=True` falla. Documentar siempre `s3gen_missing_keys` / `s3gen_unexpected_keys` en el JSON de meta.

### Parche MPS (`torch.load`)

En Apple Silicon, los `.pt` guardados en CUDA pueden romper sin `map_location`. El CLI aplica un parche **acotado**:

- Solo mientras `device_used == "mps"` (no en CPU).
- Context manager: si `map_location` no viene en kwargs → forzar `cpu`; **siempre restaura** `torch.load` original (también si hay excepción).
- Primitiva de restauración cubierta por tests sintéticos **sin** importar PyTorch (`temporary_attr_patch`).

No ampliar el parche a proceso completo / daemon sin nueva decisión.

## Protección de archivos

- `--output` y `--meta-out` que **ya existan** se rechazan salvo `--force`.
- Si el destino resuelve a la misma ruta que `--ref` (relativos / symlinks cuando `Path.resolve` puede resolverlos), se **rechaza siempre**. `--force` **no** anula la protección de la referencia vocal.
- WAV y metadatos no pueden solaparse entre sí.
- Escritura: tempfile en el mismo directorio → validación → `os.replace` atómico; si falla, se borran solo los temporales creados por la operación.

## Rangos numéricos CLI

Valores deben ser **finitos** (se rechazan NaN / ±Inf):

| Flag | Rango |
| --- | --- |
| `--exaggeration` | `[0.0, 1.0]` |
| `--cfg-weight` | `[0.0, 1.0]` |
| `--temperature` | `(0.0, 2.0]` |

Preflight (antes de cargar el modelo): existencia de `--ref`, que `--ckpt-dir` sea directorio, que destinos no sean carpetas, solapes de rutas, y que el directorio padre del destino sea escribible / creable.

## Salida de audio

1. Chatterbox genera Float32 (piloto: picos abs ≈ 1.12 en ~0,06 % de muestras).
2. El CLI **rechaza** NaN / ±Inf con error claro (no sustituye en silencio; no reporta un pico engañoso).
3. Hard clamp a `[-1, 1]`, cuenta `samples_clamped` y registra `peak_abs_before`.
4. Escribe **PCM S16LE**, mono, **24 000 Hz**, ≥1 muestra, duración > 0; comprueba cabecera RIFF/WAVE.
5. Valida el WAV antes de declarar éxito.

**Dimensiones del waveform:** si llega multi-canal, se usa el **primer canal** (layout asumido `[canal, tiempo]`); no se promedian canales.

Metadatos útiles (`--meta-out`):

- `peak_abs_before`, `samples_clamped`, `clip_ratio`, `sample_count`
- `load_seconds`, `generate_seconds`, `device_used`
- `load_meta.s3gen_missing_keys`, `load_meta.weights_only`, `runtime_pin`
- `perth_watermark: "left_intact"`

## Marca de agua Perth

Chatterbox incrusta watermark Perth en el audio generado. **No se elimina ni se altera** en este CLI. El campo de meta solo documenta la política (`left_intact`) — **no** es una verificación criptográfica del watermark.

## Uso

```bash
python3.11 tools/chatterbox/synthesize.py \
  --text "¿Puedes resolver este reto?" \
  --ref /path/to/ref.wav \
  --ckpt-dir /path/to/es-es-weights \
  --output /path/to/out.wav \
  --meta-out /path/to/out.meta.json \
  --device auto
```

Sobrescritura explícita (nunca sobre `--ref`):

```bash
python3.11 tools/chatterbox/synthesize.py ... --force
```

### Exit codes y contrato de errores

| Code | Cuándo | stdout / stderr |
| --- | --- | --- |
| `0` | Éxito, o solo `--print-pins` | JSON de resultado / pins en **stdout** |
| `1` | Error de validación / IO / carga / generación | JSON `{"ok": false, "error": "..."}` en **stderr** (sin traceback en stdout) |
| `2` | Faltan `--text` / `--output` / `--ref` / `--ckpt-dir` | JSON en **stderr** |
| `2` (argparse) | Flag desconocido / tipo argparse inválido | Mensaje **estándar de argparse** en stderr (**no** JSON). No se envuelve argparse solo para forzar JSON. |

`--device mps` o `cuda` **falla** si el backend no está disponible (sin fallback silencioso a CPU). `auto` sí puede elegir CPU.

Errores (ref ausente, ckpt incompleto, solape con ref, NaN, etc.) → exit ≠ 0. **No** degrada a audio mock.

## Pruebas unitarias (sin modelos)

Comando verificado (ejecutar desde este directorio; **no** existe el paquete `tools.chatterbox`):

```bash
cd tools/chatterbox && python3.11 -m unittest test_synthesize -v
```

### Qué cubren estos tests

- Clamp in-range / picos >1 / vacío
- Rechazo NaN, +Inf, -Inf
- Write + validate PCM16 mono 24 kHz; rechazo rate/canales/width; duración 0; no-RIFF
- Guards de sobrescritura, solape output/ref/meta, `--force` vs protección de ref
- Restauración del patch sintético de atributos (sin PyTorch)
- Rangos numéricos; CLI `--print-pins` / args faltantes / NaN en flags
- Tokens de README / pins

### Qué **no** demuestran

- Inferencia real, carga de checkpoints, compatibilidad completa de `conds.pt`, MPS real, ni Perth
- Esos puntos siguen siendo piloto / **prueba manual autorizada** posterior

## Fuera de alcance (fases posteriores)

- Provider Node (`src/shorts/voice/chatterbox.ts`), factory, env, caché SHA-256, pipeline.
- Daemon HTTP, cambio de segmentación/pausas.
- Commit de audios, pesos o rutas personales.
