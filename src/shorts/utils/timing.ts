export const secondsToFrames = (seconds: number, fps: number): number => {
  return Math.max(1, Math.round(seconds * fps));
};

export const framesToSeconds = (frames: number, fps: number): number => {
  return frames / fps;
};

export const msToFrames = (ms: number, fps: number): number => {
  return Math.max(1, Math.round((ms / 1000) * fps));
};

export const estimateNarrationSeconds = (text: string): number => {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  // ~2.6 words/sec conversational Spanish + small pause buffer
  return Math.max(0.8, words / 2.6 + 0.25);
};

export type TimedScene = {
  id: string;
  durationSeconds: number;
  durationFrames: number;
  startFrame: number;
  endFrame: number;
};

export const allocateSceneTimings = (
  scenes: Array<{id: string; durationSeconds: number}>,
  fps: number,
): TimedScene[] => {
  let cursor = 0;
  return scenes.map((scene) => {
    const durationFrames = secondsToFrames(scene.durationSeconds, fps);
    const startFrame = cursor;
    const endFrame = startFrame + durationFrames;
    cursor = endFrame;
    return {
      id: scene.id,
      durationSeconds: durationFrames / fps,
      durationFrames,
      startFrame,
      endFrame,
    };
  });
};

/**
 * Set each scene duration from measured TTS segment lengths (+ trailing pause).
 * Returns null if meta is incomplete (caller should fall back to redistribute).
 */
export const durationsFromVoiceSegments = (
  sceneIds: string[],
  segments: Array<{
    sceneId: string;
    durationSeconds: number;
    pauseAfterSec: number;
  }>,
  minPerScene = 0.7,
): number[] | null => {
  if (!segments.length || !segments.every((s) => s.sceneId && s.durationSeconds >= 0)) {
    return null;
  }
  const byScene = new Map<string, number>();
  for (const seg of segments) {
    byScene.set(
      seg.sceneId,
      (byScene.get(seg.sceneId) ?? 0) + seg.durationSeconds + seg.pauseAfterSec,
    );
  }
  const next = sceneIds.map((id) => {
    const d = byScene.get(id);
    return d !== undefined && d > 0 ? Math.max(minPerScene, d) : null;
  });
  if (next.some((d) => d === null)) return null;
  return next as number[];
};

export const redistributeToFit = (
  durations: number[],
  targetTotal: number,
  minPerScene = 0.6,
): number[] => {
  const current = durations.reduce((a, b) => a + b, 0);
  if (current <= 0) {
    return durations.map(() => Math.max(minPerScene, targetTotal / durations.length));
  }

  if (Math.abs(current - targetTotal) < 0.05) {
    return durations.map((d) => Math.max(minPerScene, d));
  }

  const scale = targetTotal / current;
  const scaled = durations.map((d) => Math.max(minPerScene, d * scale));
  const sum = scaled.reduce((a, b) => a + b, 0);

  if (sum > targetTotal) {
    // Shrink longest scenes first while respecting minimums
    const excess = sum - targetTotal;
    const flexible = scaled
      .map((d, i) => ({i, room: d - minPerScene}))
      .filter((x) => x.room > 0)
      .sort((a, b) => b.room - a.room);

    let remaining = excess;
    for (const item of flexible) {
      if (remaining <= 0) break;
      const cut = Math.min(item.room, remaining);
      scaled[item.i]! -= cut;
      remaining -= cut;
    }
  } else if (sum < targetTotal) {
    const deficit = targetTotal - sum;
    const longest = scaled
      .map((d, i) => ({i, d}))
      .sort((a, b) => b.d - a.d)[0];
    if (longest) scaled[longest.i]! += deficit;
  }

  return scaled;
};
