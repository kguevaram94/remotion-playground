#!/usr/bin/env tsx
import {Command} from 'commander';
import {runPipeline, type PipelineMode} from '../shorts/pipeline/run';
import {formatVoicesTable} from '../shorts/voice/voices-es';

const program = new Command();

program
  .name('short')
  .description('Fábrica automatizada de YouTube Shorts (acertijos) con Remotion')
  .argument('[title...]', 'Título del vídeo')
  .option('--input <path>', 'JSON de topic o script existente')
  .option('--id <id>', 'Identificador del trabajo')
  .option(
    '--voice <name>',
    'Voz macOS o alias (flo, sandy, eddy, shelley, reed, rocko, monica)',
  )
  .option(
    '--mode <mode>',
    'full | script | render | preview | resume | validate | voice | post | voices',
    'full',
  )
  .action(async (titleParts: string[], opts) => {
    const mode = opts.mode as PipelineMode | 'voices';
    if (mode === 'voices') {
      process.stdout.write(formatVoicesTable() + '\n');
      return;
    }

    const title = titleParts.join(' ').trim();
    try {
      const job = await runPipeline({
        title: title || undefined,
        id: opts.id,
        input: opts.input,
        mode: mode as PipelineMode,
        voice: opts.voice,
      });
      process.stdout.write(
        JSON.stringify(
          {
            id: job.id,
            status: job.status,
            video: job.artifacts.videoMp4 ?? null,
            preview: job.artifacts.videoPreviewMp4 ?? null,
            thumbnail: job.artifacts.thumbnailPng ?? null,
            script: job.artifacts.scriptJson ?? null,
            warnings: job.warnings,
            validation: job.validation ?? null,
          },
          null,
          2,
        ) + '\n',
      );
      if (job.status === 'failed') process.exitCode = 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      process.stderr.write(`[shorts] ERROR: ${message}\n`);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
