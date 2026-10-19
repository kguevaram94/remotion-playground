import {Audio} from '@remotion/media';
import {Sequence, staticFile} from 'remotion';

export type SfxName = 'tick' | 'whoosh' | 'pop' | 'ding';

export const Sfx: React.FC<{
  name: SfxName;
  volume?: number;
}> = ({name, volume = 0.4}) => (
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
