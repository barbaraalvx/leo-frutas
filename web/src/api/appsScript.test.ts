import { describe, expect, it } from 'vitest';
import { limparMensagem } from './appsScript';

describe('limparMensagem', () => {
  it('tira o prefixo que o Google põe', () => {
    expect(limparMensagem('Error: Nota 999 não encontrada.')).toBe('Nota 999 não encontrada.');
    expect(limparMensagem('Exception: A planilha está ocupada.')).toBe('A planilha está ocupada.');
    expect(limparMensagem('Nota 1 não encontrada.')).toBe('Nota 1 não encontrada.');
  });

  it('sem mensagem, dá uma genérica', () => {
    expect(limparMensagem(undefined)).toBe('Erro ao falar com a planilha.');
    expect(limparMensagem('Error: ')).toBe('Erro ao falar com a planilha.');
  });
});
