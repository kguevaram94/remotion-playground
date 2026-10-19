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
 */
export const renderThumbnailPng = async (
  input: ThumbnailInput,
  outputPath: string,
): Promise<string> => {
  const width = input.width ?? 1080;
  const height = input.height ?? 1920;
  const title =
    input.title.length > 72 ? `${input.title.slice(0, 69)}…` : input.title;
  const hook = input.hook?.slice(0, 80);
  const badge = (input.badge ?? 'RETO').toUpperCase();

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
          'linear-gradient(160deg, #0b1220 0%, #12233f 45%, #07111f 100%)',
        padding: 64,
        fontFamily: 'sans-serif',
      },
      children: [
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: '#38bdf8',
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: 4,
              marginBottom: 36,
            },
            children: badge,
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: '#f8fafc',
              fontSize: title.length > 40 ? 52 : 64,
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.15,
              maxWidth: 900,
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
                  marginTop: 40,
                  color: '#fbbf24',
                  fontSize: 34,
                  fontWeight: 700,
                  textAlign: 'center',
                  maxWidth: 860,
                },
                children: hook,
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
