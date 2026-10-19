import {describe, expect, it} from 'vitest';
import {ffmpegAvailable, probeMedia} from '../../src/shorts/media/ffmpeg';
import {existsSync} from 'node:fs';
import path from 'node:path';

describe('ffmpeg helpers', () => {
  it('reports whether ffprobe is reachable', () => {
    const available = ffmpegAvailable();
    expect(typeof available).toBe('boolean');
  });

  it('probes an existing short if present', () => {
    const video = path.join(process.cwd(), 'output/puntos/video.mp4');
    if (!existsSync(video)) return;
    const probe = probeMedia(video);
    expect(probe.width).toBeGreaterThan(100);
    expect(probe.duration).toBeGreaterThan(1);
  });
});
