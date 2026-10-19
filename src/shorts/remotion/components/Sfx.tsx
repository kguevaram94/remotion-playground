import {Audio} from '@remotion/media';
import {Sequence, staticFile} from 'remotion';

export type SfxName = 'tick' | 'whoosh' | 'pop' | 'ding';

/** Default volumes for procedural SFX (logic-lateral polish). */
export const SFX_VOLUME = {
  tick: 0.34,
  tickUrgent: 0.55,
  pop: 0.42,
  whoosh: 0.4,
  ding: 0.48,
} as const;

export const Sfx: React.FC<{
  name: SfxName;
  volume?: number;
}> = ({name, volume = SFX_VOLUME[name]}) => (
  <Audio src={staticFile(`sfx/${name}.wav`)} volume={volume} />
);

/** Play an SFX starting at a given frame within the parent Sequence. */
export const SfxAt: React.FC<{
  name: SfxName;
  from: number;
  durationInFrames?: number;
  volume?: number;
}> = ({name, from, durationInFrames = 20, volume}) => (
  <Sequence from={from} durationInFrames={durationInFrames} layout="none">
    <Sfx name={name} volume={volume} />
  </Sequence>
);
