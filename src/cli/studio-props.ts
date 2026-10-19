#!/usr/bin/env tsx
/**
 * Export ShortVideo props from an existing job for Remotion Studio.
 *
 *   npm run short:studio-props -- --id s4-19-interruptores
 *   npx remotion studio --props=output/<id>/studio-props.json
 */
import {Command} from 'commander';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {loadConfig} from '../shorts/config/env';
import {
  buildStudioPropsFromJob,
  writeStudioPropsFile,
} from '../shorts/remotion/studio-props';
import {JobStore} from '../shorts/storage/job-store';

const program = new Command();
program
  .name('short:studio-props')
  .description('Genera studio-props.json desde un job para Remotion Studio')
  .requiredOption('--id <id>', 'Identificador del trabajo en output/')
  .option(
    '--out <path>',
    'Ruta de salida (default: output/<id>/studio-props.json)',
  )
  .action((opts: {id: string; out?: string}) => {
    const config = loadConfig();
    const store = new JobStore(config.outputDir);
    const job = store.load(opts.id);
    if (!job) {
      process.stderr.write(`[shorts] ERROR: no existe el job "${opts.id}"\n`);
      process.exitCode = 1;
      return;
    }

    const jobDir = store.jobDir(opts.id);
    const scriptPath =
      job.artifacts.scriptJson ?? path.join(jobDir, 'script.json');
    if (!existsSync(scriptPath)) {
      process.stderr.write(
        `[shorts] ERROR: falta script.json en ${scriptPath}\n`,
      );
      process.exitCode = 1;
      return;
    }

    const props = buildStudioPropsFromJob({
      jobId: opts.id,
      jobDir,
      scriptPath,
      isTestAudio: Boolean(job.audioIsTest),
    });
    const outPath =
      opts.out ?? path.join(jobDir, 'studio-props.json');
    writeStudioPropsFile(props, outPath);

    process.stdout.write(
      JSON.stringify(
        {
          id: opts.id,
          out: outPath,
          hasAudio: Boolean(props.audioPublicFile),
          hasMusic: Boolean(props.musicPublicFile),
          subtitleCues: props.subtitles.length,
          tip: `npx remotion studio --props=${outPath}`,
        },
        null,
        2,
      ) + '\n',
    );
  });

program.parse(process.argv);
