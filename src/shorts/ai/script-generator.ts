import {readFileSync} from 'node:fs';
import path from 'node:path';
import type {AppConfig} from '../config/env';
import {parseVideoScript, type VideoScript} from '../domain/script.schema';
import {buildFindDifferentScript} from '../templates/find-different';
import {buildMathPuzzleScript} from '../templates/math-puzzle';
import {buildOpticalIllusionScript} from '../templates/optical-illusion';
import {buildLogicPuzzleFromTitle, detectFormat} from '../templates/select';
import {buildMemoryChallengeScript} from '../templates/memory-challenge';
import {buildNineDotsScript} from '../templates/logic-puzzle';
import {
  buildThreeSwitchesScript,
  isThreeSwitchesTitle,
} from '../templates/three-switches';
import {createLlmProvider, type LlmProvider} from './provider';

export type GenerateScriptInput = {
  title: string;
  id: string;
  config: AppConfig;
  provider?: LlmProvider;
};

const loadPrompt = (name: string): string => {
  const file = path.join(__dirname, 'prompts', name);
  try {
    return readFileSync(file, 'utf8');
  } catch {
    // When running via tsx from repo root with different __dirname layouts
    const alt = path.join(process.cwd(), 'src/shorts/ai/prompts', name);
    return readFileSync(alt, 'utf8');
  }
};

const extractJson = (text: string): unknown => {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No se encontró JSON en la respuesta del modelo');
  return JSON.parse(match[0]);
};

export const generateFromTemplate = (
  title: string,
  id: string,
  config: AppConfig,
): VideoScript => {
  const format = detectFormat(title);
  const opts = {
    language: config.language,
    fps: config.fps,
    width: config.width,
    height: config.height,
    targetDurationSeconds: config.targetDurationSeconds,
  };

  switch (format) {
    case 'logic-puzzle':
      if (isThreeSwitchesTitle(title)) {
        return buildThreeSwitchesScript(title, id, opts);
      }
      if (/9|nueve|puntos|dots/i.test(title)) {
        return buildNineDotsScript(title, id, opts);
      }
      return buildLogicPuzzleFromTitle(title, id, opts);
    case 'math-puzzle':
      return buildMathPuzzleScript(title, id, opts);
    case 'optical-illusion':
      return buildOpticalIllusionScript(title, id, opts);
    case 'memory-challenge':
      return buildMemoryChallengeScript(title, id, opts);
    case 'find-different':
    default:
      return buildFindDifferentScript(title, id, opts);
  }
};

export const generateScript = async (
  input: GenerateScriptInput,
): Promise<{script: VideoScript; provider: string; model: string}> => {
  const {title, id, config} = input;

  if (config.aiProvider === 'template') {
    const script = generateFromTemplate(title, id, config);
    return {script, provider: 'template', model: config.aiModel};
  }

  const provider = input.provider ?? createLlmProvider(config);
  const system = loadPrompt('script.md');
  const user = JSON.stringify(
    {
      title,
      id,
      language: config.language,
      targetDurationSeconds: config.targetDurationSeconds,
      fps: config.fps,
      resolution: {width: config.width, height: config.height},
      aspectRatio: '9:16',
      schemaVersion: 1,
      allowedFormats: [
        'find-different',
        'math-puzzle',
        'optical-illusion',
        'logic-puzzle',
        'memory-challenge',
      ],
    },
    null,
    2,
  );

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const completion = await provider.complete(
        [
          {role: 'system', content: system},
          {
            role: 'user',
            content:
              attempt === 0
                ? `Genera el VideoScript JSON para:\n${user}`
                : `Tu JSON anterior era inválido (${lastError?.message}). Devuelve SOLO JSON corregido para:\n${user}`,
          },
        ],
        {temperature: attempt === 0 ? 0.4 : 0.2},
      );

      const raw = extractJson(completion.content);
      if (!raw || typeof raw !== 'object') {
        throw new Error('JSON del modelo no es un objeto');
      }
      const parsed = parseVideoScript({
        ...(raw as Record<string, unknown>),
        id,
        title,
        createdAt: new Date().toISOString(),
      });
      return {
        script: parsed,
        provider: completion.provider,
        model: completion.model,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  // Fallback controlado a plantilla local
  const script = generateFromTemplate(title, id, config);
  return {
    script,
    provider: `${provider.name}+template-fallback`,
    model: config.aiModel,
  };
};
