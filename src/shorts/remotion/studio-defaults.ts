import logicLateralTemplate from '../../../data/templates/script-logic-lateral.json';
import {parseVideoScript, type VideoScript} from '../domain/script.schema';
import type {
  SubtitleCueProp,
  SubtitleWordProp,
} from './components/SubtitleTrack';

/** Props shape shared with ShortVideo (kept here to avoid circular imports). */
export type StudioShortVideoProps = {
  jobId: string;
  script: VideoScript | null;
  audioPublicFile: string | null;
  musicPublicFile: string | null;
  musicVolume: number;
  subtitles: SubtitleCueProp[];
  subtitleWords: SubtitleWordProp[];
  isTestAudio: boolean;
};

/**
 * Defaults for Remotion Studio (`npm run dev`).
 * Official logic-lateral plantilla so ShortVideo is not empty.
 * Visual-only: no audio/music (use `short:studio-props` from a real job).
 */
export const buildStudioShortVideoDefaults = (): StudioShortVideoProps => {
  const script = parseVideoScript(logicLateralTemplate);
  return {
    jobId: 'studio-demo-logic-lateral',
    script,
    audioPublicFile: null,
    musicPublicFile: null,
    musicVolume: 0.12,
    subtitles: [],
    subtitleWords: [],
    isTestAudio: false,
  };
};
