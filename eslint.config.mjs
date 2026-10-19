import {config} from '@remotion/eslint-config-flat';

export default [
  ...config,
  {
    ignores: [
      'src/shorts/ai/**',
      'src/shorts/pipeline/**',
      'src/shorts/templates/**',
      'src/shorts/storage/**',
      'src/shorts/config/**',
      'src/shorts/voice/**',
      'src/shorts/subtitles/**',
      'src/shorts/utils/**',
      'src/shorts/domain/**',
      'src/shorts/media/**',
      'src/cli/**',
      '.cursor/**',
      'tests/**',
      'output/**',
      'data/**',
    ],
  },
];
