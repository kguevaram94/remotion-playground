/**
 * Catálogo de voces macOS en español (España).
 * Las "neural" (Enhanced) suelen sonar menos robóticas que Mónica clásica.
 */
export type MacOsVoiceOption = {
  id: string;
  sayName: string;
  locale: 'es_ES' | 'es_MX';
  quality: 'neural' | 'classic' | 'character';
  gender: 'female' | 'male' | 'other';
  notes: string;
};

export const VOICES_ES_ES: MacOsVoiceOption[] = [
  {
    id: 'flo',
    sayName: 'Flo (Español (España))',
    locale: 'es_ES',
    quality: 'neural',
    gender: 'female',
    notes: 'Recomendada por defecto — natural, clara para Shorts',
  },
  {
    id: 'sandy',
    sayName: 'Sandy (Español (España))',
    locale: 'es_ES',
    quality: 'neural',
    gender: 'female',
    notes: 'Neural femenina, tono cercano',
  },
  {
    id: 'shelley',
    sayName: 'Shelley (Español (España))',
    locale: 'es_ES',
    quality: 'neural',
    gender: 'female',
    notes: 'Neural femenina',
  },
  {
    id: 'eddy',
    sayName: 'Eddy (Español (España))',
    locale: 'es_ES',
    quality: 'neural',
    gender: 'male',
    notes: 'Neural masculina',
  },
  {
    id: 'reed',
    sayName: 'Reed (Español (España))',
    locale: 'es_ES',
    quality: 'neural',
    gender: 'male',
    notes: 'Neural masculina',
  },
  {
    id: 'rocko',
    sayName: 'Rocko (Español (España))',
    locale: 'es_ES',
    quality: 'neural',
    gender: 'male',
    notes: 'Neural masculina, más grave',
  },
  {
    id: 'grandma',
    sayName: 'Grandma (Español (España))',
    locale: 'es_ES',
    quality: 'character',
    gender: 'female',
    notes: 'Personaje (abuela)',
  },
  {
    id: 'grandpa',
    sayName: 'Grandpa (Español (España))',
    locale: 'es_ES',
    quality: 'character',
    gender: 'male',
    notes: 'Personaje (abuelo)',
  },
  {
    id: 'monica',
    sayName: 'Mónica',
    locale: 'es_ES',
    quality: 'classic',
    gender: 'female',
    notes: 'Clásica — suele sonar más robótica',
  },
];

export const DEFAULT_VOICE_ES_ES = VOICES_ES_ES[0]!.sayName;

export const resolveVoiceAlias = (input: string): string => {
  const trimmed = input.trim();
  const byId = VOICES_ES_ES.find((v) => v.id === trimmed.toLowerCase());
  if (byId) return byId.sayName;
  const byName = VOICES_ES_ES.find(
    (v) => v.sayName.toLowerCase() === trimmed.toLowerCase(),
  );
  if (byName) return byName.sayName;
  return trimmed;
};

export const formatVoicesTable = (): string => {
  const rows = VOICES_ES_ES.map(
    (v) =>
      `${v.id.padEnd(10)} ${v.quality.padEnd(10)} ${v.gender.padEnd(8)} ${v.sayName}\n           ${v.notes}`,
  );
  return [
    '⚠️  macOS say suena sintético. Para narración natural usa openai-tts, file o elevenlabs.',
    '    Guía: docs/voice.md',
    '',
    '— Natural (OpenAI) —',
    'VOICE_PROVIDER=openai-tts  VOICE_NAME=coral|nova|sage|ash|ballad',
    'npm run short:voice -- --id <id>',
    '',
    '— Tu voz grabada —',
    'npm run short:record -- --id <id>',
    'VOICE_PROVIDER=file npm run short:voice -- --id <id>',
    '',
    '— Clonar tu voz (ElevenLabs) —',
    'npm run short:clone-voice -- --sample data/voices/me.wav --save-env',
    'VOICE_PROVIDER=elevenlabs npm run short:voice -- --id <id>',
    '',
    '— macOS say (robóticas, legacy) —',
    ...rows,
    '',
    'Muestras say: output/voice-samples/es-ES/<id>.wav',
  ].join('\n');
};
