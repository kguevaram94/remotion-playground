import {describe, expect, it} from 'vitest';
import {hashContent, makeJobId, slugify} from '../../src/shorts/utils/ids';

describe('ids', () => {
  it('slugifies titles', () => {
    expect(slugify('¿Puedes resolver el reto de los 9 puntos?')).toContain(
      'puntos',
    );
  });

  it('makes stable-ish job ids', () => {
    const id = makeJobId('¿Puedes resolver el reto de los 9 puntos?');
    expect(id.length).toBeGreaterThan(2);
    expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('hashes content deterministically', () => {
    expect(hashContent({a: 1})).toBe(hashContent({a: 1}));
  });
});
