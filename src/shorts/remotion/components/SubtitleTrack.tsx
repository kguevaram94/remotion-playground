import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {
  groupWordsIntoSentences,
  pickSentenceAtTime,
  windowForSentence,
} from '../../subtitles/subtitle-sentences';
import {SAFE, shortColors, shortFont} from '../theme';

export type SubtitleCueProp = {
  startMs: number;
  endMs: number;
  text: string;
};

export type SubtitleWordProp = {
  text: string;
  startMs: number;
  endMs: number;
};

const WORDS_PER_LINE = 5;

export const SubtitleTrack: React.FC<{
  cues: SubtitleCueProp[];
  words?: SubtitleWordProp[];
}> = ({cues, words = []}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const timeMs = (frame / fps) * 1000;

  if (words.length > 0) {
    const sentences = groupWordsIntoSentences(words);
    const picked = pickSentenceAtTime(sentences, timeMs);
    if (!picked) return null;

    const {sentence, inPause} = picked;
    const {words: windowWords, offset} = windowForSentence(
      sentence,
      timeMs,
      WORDS_PER_LINE,
      inPause,
    );
    if (!windowWords.length) return null;

    const localStart = Math.max(
      0,
      ((timeMs - Math.max(sentence.startMs, windowWords[0]!.startMs)) / 1000) *
        fps,
    );
    const opacity = interpolate(localStart, [0, 3], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });

    return (
      <AbsoluteFill
        style={{
          justifyContent: 'flex-end',
          alignItems: 'center',
          paddingBottom: SAFE.bottom - 80,
          paddingLeft: SAFE.side,
          paddingRight: SAFE.side,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            opacity: inPause ? 1 : opacity,
            background: 'rgba(2,6,23,0.88)',
            border: '1px solid rgba(148,163,184,0.28)',
            borderRadius: 18,
            padding: '18px 26px',
            maxWidth: 1000,
            textAlign: 'center',
            fontFamily: shortFont,
            fontSize: 52,
            fontWeight: 800,
            lineHeight: 1.3,
            letterSpacing: '-0.01em',
          }}
        >
          {windowWords.map((w, i) => {
            const isActive = !inPause && timeMs >= w.startMs && timeMs < w.endMs;
            return (
              <span
                key={`${offset + i}-${w.startMs}`}
                style={{
                  color: isActive
                    ? shortColors.warn
                    : inPause
                      ? shortColors.text
                      : timeMs >= w.endMs
                        ? shortColors.text
                        : 'rgba(248,250,252,0.72)',
                  marginRight: i < windowWords.length - 1 ? 12 : 0,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>
    );
  }

  const active = cues.find((c) => timeMs >= c.startMs && timeMs < c.endMs);
  if (!active) return null;

  const localStart = ((timeMs - active.startMs) / 1000) * fps;
  const opacity = interpolate(localStart, [0, 4], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: SAFE.bottom - 80,
        paddingLeft: SAFE.side,
        paddingRight: SAFE.side,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          opacity,
          background: 'rgba(2,6,23,0.88)',
          border: '1px solid rgba(148,163,184,0.28)',
          borderRadius: 18,
          padding: '18px 26px',
          maxWidth: 1000,
          textAlign: 'center',
          fontFamily: shortFont,
          fontSize: 52,
          fontWeight: 800,
          color: shortColors.text,
          lineHeight: 1.3,
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
