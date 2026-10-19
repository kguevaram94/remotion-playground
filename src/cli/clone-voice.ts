#!/usr/bin/env tsx
/**
 * Clone your voice with ElevenLabs from a short clean sample (30s–2min).
 *
 *   npm run short:clone-voice -- --sample data/voices/me.wav --name "Kevin Shorts"
 *
 * Then add to .env:
 *   VOICE_PROVIDER=elevenlabs
 *   ELEVENLABS_API_KEY=...
 *   ELEVENLABS_VOICE_ID=<returned id>
 */
import {config as loadDotenv} from 'dotenv';
import {Command} from 'commander';
import {existsSync, appendFileSync} from 'node:fs';
import path from 'node:path';
import {cloneVoiceElevenLabs} from '../shorts/voice/elevenlabs';

loadDotenv();

const program = new Command();
program
  .requiredOption('--sample <path>', 'WAV/MP3 limpio de tu voz (30s–2min)')
  .option('--name <name>', 'Nombre del clon', 'Mi voz Shorts')
  .option('--save-env', 'Escribe ELEVENLABS_VOICE_ID en .env', false)
  .action(async (opts) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      process.stderr.write(
        'Falta ELEVENLABS_API_KEY en .env (https://elevenlabs.io)\n',
      );
      process.exitCode = 1;
      return;
    }
    const sample = path.resolve(opts.sample);
    if (!existsSync(sample)) {
      process.stderr.write(`No existe: ${sample}\n`);
      process.exitCode = 1;
      return;
    }

    process.stdout.write(`[shorts] Clonando voz desde ${sample}…\n`);
    const {voiceId} = await cloneVoiceElevenLabs({
      apiKey,
      name: opts.name,
      samplePath: sample,
      timeoutMs: 120_000,
    });

    process.stdout.write(`\nvoice_id=${voiceId}\n`);
    process.stdout.write(
      `\nAñade a .env:\nVOICE_PROVIDER=elevenlabs\nELEVENLABS_VOICE_ID=${voiceId}\n\n`,
    );

    if (opts.saveEnv) {
      appendFileSync(
        path.join(process.cwd(), '.env'),
        `\nVOICE_PROVIDER=elevenlabs\nELEVENLABS_VOICE_ID=${voiceId}\n`,
      );
      process.stdout.write('Actualizado .env\n');
    }
  });

program.parseAsync(process.argv);
