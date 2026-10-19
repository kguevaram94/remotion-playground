import {describe, expect, it, beforeEach, afterEach} from 'vitest';
import {mkdtempSync, rmSync, existsSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {renderThumbnailPng} from '../../src/shorts/media/thumbnail';

describe('satori thumbnail', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), 'thumb-'));
  });

  afterEach(() => {
    rmSync(dir, {recursive: true, force: true});
  });

  it('renders a PNG cover', async () => {
    const out = path.join(dir, 'thumb.png');
    await renderThumbnailPng(
      {
        title: '¿Puedes resolver el reto de los 9 puntos?',
        hook: '4 líneas · sin levantar el lápiz',
        badge: 'RETO',
        width: 540,
        height: 960,
      },
      out,
    );
    expect(existsSync(out)).toBe(true);
    expect(statSync(out).size).toBeGreaterThan(5_000);
  });

  it('renders with badge and long title without crashing', async () => {
    const out = path.join(dir, 'thumb-long.png');
    await renderThumbnailPng(
      {
        title:
          'Tres interruptores y una bombilla: ¿cuál la enciende sin mirar dos veces?',
        hook: 'Piensa antes del countdown',
        badge: 'LOGIC-LATERAL',
        width: 540,
        height: 960,
      },
      out,
    );
    expect(existsSync(out)).toBe(true);
    expect(statSync(out).size).toBeGreaterThan(4_000);
  });
});
