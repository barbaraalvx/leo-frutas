import { describe, expect, it } from 'vitest';
import { desdeDoFiltro } from './notas';

describe('desdeDoFiltro', () => {
  // 16/10/2026 01:00 UTC = 15/10/2026 22:00 em João Pessoa
  const agora = new Date('2026-10-16T01:00:00Z');

  it('hoje começa à meia-noite de João Pessoa', () => {
    expect(desdeDoFiltro('hoje', agora)).toBe('2026-10-15T03:00:00.000Z');
  });

  it('7 e 30 dias contam o dia de hoje', () => {
    expect(desdeDoFiltro('7d', agora)).toBe('2026-10-09T03:00:00.000Z');
    expect(desdeDoFiltro('30d', agora)).toBe('2026-09-16T03:00:00.000Z');
  });

  it('tudo não filtra', () => {
    expect(desdeDoFiltro('tudo', agora)).toBeUndefined();
  });
});
