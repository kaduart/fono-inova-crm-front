import { describe, it, expect } from 'vitest';
import { AVATAR_COLORS, getAvatarColor } from '../avatarColors';

describe('getAvatarColor', () => {
  it('é determinístico: mesmo nome, mesma cor', () => {
    expect(getAvatarColor('Gabrielle Campos Ferreira')).toEqual(getAvatarColor('Gabrielle Campos Ferreira'));
  });

  it('segue a regra das outras telas (charCode da 1ª letra % paleta)', () => {
    expect(getAvatarColor('Ana Paula')).toEqual(AVATAR_COLORS['A'.charCodeAt(0) % AVATAR_COLORS.length]);
  });

  it('nome vazio ou ausente cai na primeira cor, sem quebrar', () => {
    expect(getAvatarColor()).toEqual(AVATAR_COLORS[0]);
    expect(getAvatarColor('   ')).toEqual(AVATAR_COLORS[0]);
  });
});
