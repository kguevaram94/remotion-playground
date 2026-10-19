#!/usr/bin/env tsx
/**
 * Record narration from the Mac microphone into output/<id>/narration.custom.wav
 *
 *   npm run short:record -- --id puntos
 *
 * Then:
 *   VOICE_PROVIDER=file npm run short:voice -- --id puntos
 *
 * Speaks the script lines so you can read along, then records until Ctrl+C
 * or --seconds N.
 */
import {config as loadDotenv} from 'dotenv';
import {Command} from 'commander';
import {spawn, spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, readFileSync} from 'node:fs';
import path from 'node:path';

loadDotenv();

const program = new Command();
program
  .requiredOption('--id <id>', 'Job id (carpeta en output/)')
  .option('--seconds <n>', 'Duración fija en segundos (si omites, Ctrl+C)', '')
  .option('--device <name>', 'Dispositivo avfoundation (default :0)', ':0')
  .action(async (opts) => {
    const jobDir = path.join(process.cwd(), 'output', opts.id);
    const scriptPath = path.join(jobDir, 'script.json');
    if (!existsSync(scriptPath)) {
      process.stderr.write(
        `No hay script en ${scriptPath}. Genera el short primero.\n`,
      );
      process.exitCode = 1;
      return;
    }

    mkdirSync(jobDir, {recursive: true});
    const out = path.join(jobDir, 'narration.custom.wav');
    const script = JSON.parse(readFileSync(scriptPath, 'utf8')) as {
      scenes: Array<{narration: string}>;
    };
    const text = script.scenes.map((s) => s.narration).join('\n\n');

    process.stdout.write('\n=== LEE EN VOZ ALTA ===\n\n');
    process.stdout.write(text + '\n\n');
    process.stdout.write('======================\n\n');

    const ffmpeg = spawnSync('which', ['ffmpeg'], {encoding: 'utf8'});
    if (ffmpeg.status !== 0) {
      process.stderr.write(
        'Necesitas ffmpeg para grabar: brew install ffmpeg\n' +
          'O graba con QuickTime y guarda como output/' +
          opts.id +
          '/narration.custom.wav\n',
      );
      process.exitCode = 1;
      return;
    }

    const args = [
      '-y',
      '-f',
      'avfoundation',
      '-i',
      opts.device,
      '-ac',
      '1',
      '-ar',
      '44100',
    ];
    if (opts.seconds) {
      args.push('-t', String(opts.seconds));
    }
    args.push(out);

    process.stdout.write(
      `[shorts] Grabando → ${out}\n` +
        (opts.seconds
          ? `(${opts.seconds}s)\n`
          : 'Pulsa Ctrl+C para terminar.\n'),
    );

    const child = spawn('ffmpeg', args, {stdio: 'inherit'});
    const stop = () => {
      child.kill('SIGINT');
    };
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);

    const code: number = await new Promise((resolve) => {
      child.on('close', (c) => resolve(c ?? 0));
    });

    if (existsSync(out)) {
      process.stdout.write(
        `\nListo. Ahora:\n  VOICE_PROVIDER=file npm run short:voice -- --id ${opts.id}\n`,
      );
    } else {
      process.stderr.write(`Grabación falló (código ${code})\n`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
