import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync, existsSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {runPipeline} from '../../src/shorts/pipeline/run';
import {loadConfig} from '../../src/shorts/config/env';
import {validateScriptPuzzles} from '../../src/shorts/domain/puzzle-validator';
import {parseVideoScript} from '../../src/shorts/domain/script.schema';

describe('pipeline script generation', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'shorts-pipe-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('generates and validates the 9-puntos script without external APIs', async () => {
    const config = {
      ...loadConfig(),
      outputDir: dir,
      aiProvider: 'template' as const,
      voiceProvider: 'mock' as const,
      humanReviewPolicy: 'warn_and_continue' as const,
    };

    const job = await runPipeline({
      title: '¿Puedes resolver el reto de los 9 puntos?',
      id: '9-puntos',
      mode: 'script',
      config,
    });

    expect(job.status === 'failed').toBe(false);
    const scriptPath = path.join(dir, '9-puntos', 'script.json');
    expect(existsSync(scriptPath)).toBe(true);
    const script = parseVideoScript(
      JSON.parse(readFileSync(scriptPath, 'utf8')),
    );
    const validation = validateScriptPuzzles(script);
    expect(validation.ok).toBe(true);
    expect(validation.level).toBe('auto_validated');
    expect(script.format).toBe('logic-puzzle');
  });
});
