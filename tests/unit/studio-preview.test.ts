import {mkdtempSync, writeFileSync, readFileSync, mkdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {buildStudioShortVideoDefaults} from '../../src/shorts/remotion/studio-defaults';
import {
  buildStudioPropsFromJob,
  writeStudioPropsFile,
} from '../../src/shorts/remotion/studio-props';
import {parseVideoScript} from '../../src/shorts/domain/script.schema';

describe('studio / preview (P7 · T-STUDIO-001)', () => {
  it('loads logic-lateral plantilla as ShortVideo Studio defaults', () => {
    const defaults = buildStudioShortVideoDefaults();
    expect(defaults.jobId).toBe('studio-demo-logic-lateral');
    expect(defaults.script).not.toBeNull();
    expect(defaults.script?.format).toBe('logic-puzzle');
    expect(defaults.script?.scenes.map((s) => s.type)).toEqual([
      'hook',
      'instruction',
      'countdown',
      'explanation',
      'reveal',
      'outro',
    ]);
    expect(defaults.audioPublicFile).toBeNull();
    expect(defaults.musicPublicFile).toBeNull();
  });

  it('builds and writes studio-props from a job directory', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'studio-props-'));
    const template = JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'data/templates/script-math.json'),
        'utf8',
      ),
    ) as unknown;
    const script = parseVideoScript(template);
    const scriptPath = path.join(dir, 'script.json');
    writeFileSync(scriptPath, JSON.stringify(script), 'utf8');

    const props = buildStudioPropsFromJob({
      jobId: 'tmp-math',
      jobDir: dir,
      scriptPath,
      isTestAudio: true,
    });
    expect(props.script?.family).toBe('math');
    expect(props.isTestAudio).toBe(true);

    const out = path.join(dir, 'studio-props.json');
    writeStudioPropsFile(props, out);
    const roundtrip = JSON.parse(readFileSync(out, 'utf8')) as {
      jobId: string;
      script: {family?: string};
    };
    expect(roundtrip.jobId).toBe('tmp-math');
    expect(roundtrip.script.family).toBe('math');
  });

  it('fails clearly when script.json is missing', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'studio-props-missing-'));
    mkdirSync(dir, {recursive: true});
    expect(() =>
      buildStudioPropsFromJob({
        jobId: 'missing',
        jobDir: dir,
        scriptPath: path.join(dir, 'script.json'),
      }),
    ).toThrow(/script\.json/);
  });
});
