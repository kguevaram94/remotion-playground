import {createHash} from 'node:crypto';

const STOPWORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'de',
  'del',
  'y',
  'o',
  'a',
  'en',
  'por',
  'para',
  'con',
  'que',
  'puedes',
  'puedo',
  'resolver',
  'reto',
  'este',
  'esta',
  'estos',
  'estas',
  'cuantos',
  'cuántos',
  'cuantas',
  'cuántas',
]);

export const slugify = (input: string): string => {
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w))
    .slice(0, 6)
    .join('-');

  return normalized || `short-${Date.now().toString(36)}`;
};

export const makeJobId = (title: string): string => {
  const slug = slugify(title);
  if (slug.length >= 3) return slug;
  const hash = createHash('sha1').update(title).digest('hex').slice(0, 8);
  return `short-${hash}`;
};

export const hashContent = (value: unknown): string => {
  return createHash('sha256')
    .update(typeof value === 'string' ? value : JSON.stringify(value))
    .digest('hex');
};
