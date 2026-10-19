import {writeFileSync, mkdirSync, readFileSync, existsSync} from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import {Resvg} from '@resvg/resvg-js';

export type ThumbnailInput = {
  title: string;
  hook?: string;
  badge?: string;
  width?: number;
  height?: number;
};

/**
 * YouTube/Shorts cover via Satori → SVG → PNG (no browser needed).
 * Single layout for all formats (no per-family templates).
 */
export const renderThumbnailPng = async (
  input: ThumbnailInput,
  outputPath: string,
): Promise<string> => {
  const width = input.width ?? 1080;
  const height = input.height ?? 1920;
  const title =
    input.title.length > 72 ? `${input.title.slice(0, 69)}…` : input.title;
  const hook = input.hook?.trim().slice(0, 80);
  const badge = (input.badge ?? 'RETO').toUpperCase();
  const titleSize = title.length > 48 ? 48 : title.length > 32 ? 56 : 68;

  // Satori accepts a React-like element tree; cast keeps us free of JSX in Node scripts.
  const tree = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background:
          'linear-gradient(165deg, #050b16 0%, #0f2744 42%, #071018 100%)',
        padding: 72,
        fontFamily: 'sans-serif',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              backgroundColor: 'rgba(56, 189, 248, 0.14)',
              border: '2px solid #38bdf8',
              borderRadius: 999,
              padding: '14px 36px',
              marginBottom: 48,
            },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    color: '#7dd3fc',
                    fontSize: 30,
                    fontWeight: 700,
                    letterSpacing: 6,
                  },
                  children: badge,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              width: 120,
              height: 6,
              backgroundColor: '#fbbf24',
              borderRadius: 4,
              marginBottom: 36,
            },
            children: '',
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: '#f8fafc',
              fontSize: titleSize,
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.18,
              maxWidth: 920,
              textShadow: '0 2px 24px rgba(0,0,0,0.55)',
            },
            children: title,
          },
        },
        hook
          ? {
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  marginTop: 44,
                  backgroundColor: 'rgba(251, 191, 36, 0.12)',
                  border: '2px solid rgba(251, 191, 36, 0.55)',
                  borderRadius: 20,
                  padding: '22px 36px',
                  maxWidth: 880,
                },
                children: [
                  {
                    type: 'div',
                    props: {
                      style: {
                        display: 'flex',
                        color: '#fde68a',
                        fontSize: 32,
                        fontWeight: 700,
                        textAlign: 'center',
                        lineHeight: 1.3,
                      },
                      children: hook,
                    },
                  },
                ],
              },
            }
          : null,
      ].filter(Boolean),
    },
  };

  const svg = await satori(tree as never, {
    width,
    height,
    fonts: [
      {
        name: 'sans-serif',
        data: loadSystemFont(),
        weight: 700,
        style: 'normal',
      },
    ],
  });

  const resvg = new Resvg(svg, {
    fitTo: {mode: 'width', value: width},
  });
  const png = resvg.render().asPng();
  mkdirSync(path.dirname(outputPath), {recursive: true});
  writeFileSync(outputPath, png);
  return outputPath;
};

const loadSystemFont = (): ArrayBuffer => {
  const candidates = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
  ];
  for (const file of candidates) {
    if (existsSync(file)) {
      const buf = readFileSync(file);
      return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    }
  }
  throw new Error(
    'No se encontró una fuente TTF del sistema para Satori. Instala Arial o DejaVu.',
  );
};
