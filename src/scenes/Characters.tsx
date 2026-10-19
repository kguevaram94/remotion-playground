import Peep, {
  type AccessoryType,
  type FaceType,
  type HairType,
  type StandingPoseType,
} from 'react-peeps';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {colors} from './shared';

export type CharacterMood =
  | 'think'
  | 'search'
  | 'filter'
  | 'conflict'
  | 'worried'
  | 'open';

type PeepLook = {
  body: StandingPoseType;
  face: FaceType;
  hair: HairType;
  accessory?: AccessoryType;
  backgroundColor: string;
};

const LOOKS: Record<CharacterMood, PeepLook> = {
  think: {
    body: 'RestingWB',
    face: 'Concerned',
    hair: 'ShortVolumed',
    backgroundColor: colors.warn,
  },
  search: {
    body: 'PointingFingerWB',
    face: 'Driven',
    hair: 'Bun',
    accessory: 'GlassRoundThick',
    backgroundColor: colors.confirm,
  },
  filter: {
    body: 'CrossedArmsWB',
    face: 'Suspicious',
    hair: 'MediumLong',
    backgroundColor: colors.confirm,
  },
  conflict: {
    body: 'WalkingWB',
    face: 'VeryAngry',
    hair: 'Mohawk',
    backgroundColor: colors.contradict,
  },
  worried: {
    body: 'EasingWB',
    face: 'ConcernedFear',
    hair: 'ShortMessy',
    backgroundColor: colors.warn,
  },
  open: {
    body: 'ShirtPantsWB',
    face: 'SmileBig',
    hair: 'Afro',
    backgroundColor: colors.accent,
  },
};

const STANDING_VIEWBOX = {
  x: '-80',
  y: '-40',
  width: '1500',
  height: '2600',
};

type CharacterProps = {
  mood?: CharacterMood;
  accent?: string;
  delay?: number;
  scale?: number;
  style?: React.CSSProperties;
  lookOverride?: Partial<PeepLook>;
};

export const Character: React.FC<CharacterProps> = ({
  mood = 'think',
  accent,
  delay = 0,
  scale = 1,
  style,
  lookOverride,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({
    frame: frame - delay,
    fps,
    config: {damping: 14, stiffness: 100},
  });

  const t = frame / fps;
  const bob = Math.sin(t * 2.6 + delay * 0.15) * 8;
  const sway = Math.sin(t * 1.8 + delay) * 1.8;

  const look = {...LOOKS[mood], ...lookOverride};
  const fill = accent ?? look.backgroundColor;

  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [48, 0]) + bob}px) rotate(${sway}deg) scale(${(0.9 + enter * 0.1) * scale})`,
        transformOrigin: 'bottom center',
        ...style,
      }}
    >
      <Peep
        style={{width: 340, height: 480}}
        viewBox={STANDING_VIEWBOX}
        body={look.body}
        face={look.face}
        hair={look.hair}
        accessory={look.accessory}
        strokeColor="#0f172a"
        backgroundColor={fill}
      />
    </div>
  );
};

export const CharacterPair: React.FC<{
  leftMood: CharacterMood;
  rightMood: CharacterMood;
  leftAccent?: string;
  rightAccent?: string;
}> = ({
  leftMood,
  rightMood,
  leftAccent = colors.confirm,
  rightAccent = colors.contradict,
}) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      gap: 12,
    }}
  >
    <Character
      mood={leftMood}
      accent={leftAccent}
      delay={4}
      scale={0.86}
      lookOverride={
        leftMood === 'open'
          ? {hair: 'LongCurly', face: 'Smile', body: 'ShirtPantsWB'}
          : undefined
      }
    />
    <Character
      mood={rightMood}
      accent={rightAccent}
      delay={10}
      scale={0.86}
    />
  </div>
);
