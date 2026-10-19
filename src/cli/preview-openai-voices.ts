#!/usr/bin/env tsx
/**
 * Generate short OpenAI TTS samples (~1 sentence) so you can listen
 * before spending credits on a full Short.
 *
 *   npm run short:preview-voices
 *   npm run short:preview-voices -- --voices coral,nova,sage
 */
import {config as loadDotenv} from 'dotenv';
import {Command} from 'commander';
import {mkdirSync, writeFileSync} from 'node:fs';
import path from 'node:path';
import {
  DEFAULT_OPENAI_TTS_INSTRUCTIONS,
  OPENAI_TTS_VOICES,
  synthesizeOpenAiTts,
} from '../shorts/voice/openai-tts';

loadDotenv();

const SAMPLE_TEXT =
  'Nueve puntos. ¿Puedes unirlos con cuatro líneas rectas sin levantar el lápiz? La clave es salir del cuadrado imaginario.';

/** Force Spanish Spain — openai.fm demos default to English. */
const SPANISH_INSTRUCTIONS = [
  'IMPORTANT: Speak ONLY in Spanish from Spain (castellano de España).',
  'Do not use an English accent. Pronounce every word as a native Spanish speaker from Madrid.',
  'Natural YouTube Shorts host energy: clear, expressive, not robotic.',
  'Never switch to English.',
].join(' ');

const program = new Command();
program
  .option(
    '--voices <list>',
    'Lista separada por comas (default: coral,nova,sage,ash,ballad)',
    'coral,nova,sage,ash,ballad',
  )
  .option('--text <text>', 'Frase de prueba', SAMPLE_TEXT)
  .action(async (opts) => {
    const apiKey = process.env.OPENAI_API_KEY || process.env.VOICE_API_KEY;
    if (!apiKey) {
      process.stderr.write(
        'Falta OPENAI_API_KEY en .env. Sin clave no se puede llamar a la API.\n',
      );
      process.exitCode = 1;
      return;
    }

    const model = process.env.VOICE_TTS_MODEL || 'gpt-4o-mini-tts';
    const wanted = String(opts.voices)
      .split(',')
      .map((v: string) => v.trim().toLowerCase())
      .filter(Boolean);

    const outDir = path.join(process.cwd(), 'output', 'voice-samples', 'openai');
    mkdirSync(outDir, {recursive: true});

    process.stdout.write(
      `[shorts] Probando OpenAI TTS (${model}) — frase corta, bajo coste\n`,
    );
    process.stdout.write(`Texto: "${opts.text}"\n\n`);

    const catalog: string[] = [
      '# Muestras OpenAI TTS',
      '',
      `Modelo: \`${model}\``,
      `Texto: ${opts.text}`,
      '',
      '| Archivo | Voz |',
      '| --- | --- |',
    ];

    for (const voice of wanted) {
      if (!(OPENAI_TTS_VOICES as readonly string[]).includes(voice)) {
        process.stderr.write(`  skip (voz desconocida): ${voice}\n`);
        continue;
      }
      const out = path.join(outDir, `${voice}.wav`);
      process.stdout.write(`→ ${voice}… `);
      try {
        const result = await synthesizeOpenAiTts(opts.text, out, {
          apiKey,
          model,
          voice,
          instructions:
            process.env.VOICE_INSTRUCTIONS ||
            `${SPANISH_INSTRUCTIONS} ${DEFAULT_OPENAI_TTS_INSTRUCTIONS}`,
          timeoutMs: 60_000,
        });
        process.stdout.write(
          `ok (${result.durationSeconds.toFixed(1)}s) → ${out}\n`,
        );
        catalog.push(`| ${voice}.wav | \`${voice}\` |`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        process.stderr.write(`ERROR: ${msg}\n`);
      }
    }

    catalog.push(
      '',
      'Elegida una, pon en `.env`:',
      '```bash',
      'VOICE_PROVIDER=openai-tts',
      `VOICE_TTS_MODEL=${model}`,
      'VOICE_NAME=coral   # la que prefieras',
      '```',
      '',
      'Luego: `npm run short:voice -- --id puntos`',
    );
    writeFileSync(path.join(outDir, 'README.md'), catalog.join('\n') + '\n');
    process.stdout.write(`\nAbre: ${outDir}\n`);
  });

program.parseAsync(process.argv);
