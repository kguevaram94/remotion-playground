import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync, existsSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {MockVoiceProvider} from '../../src/shorts/voice/provider';

describe('mock voice provider', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'voice-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('writes an explicitly marked test wav', async () => {
    const provider = new MockVoiceProvider();
    const out = path.join(dir, 'n.wav');
    const result = await provider.synthesize(
      'Hola esto es una prueba de narración corta',
      out,
    );
    expect(result.isTestAudio).toBe(true);
    expect(existsSync(out)).toBe(true);
    expect(statSync(out).size).toBeGreaterThan(100);
    expect(result.durationSeconds).toBeGreaterThan(0.5);
    expect(result.cues?.length).toBeGreaterThan(0);
  });
});
