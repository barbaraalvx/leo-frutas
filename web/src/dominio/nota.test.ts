import { describe, expect, it } from 'vitest';
import {
  CLIENTE_MAX,
  estaAjustada,
  NOTA_VAZIA,
  type AcaoNota,
  type NotaEmMontagem,
  paraItens,
  podeGerar,
  reducerNota,
  totalNota,
  valorCalculado,
  valorFinal,
} from './nota';
import type { Produto } from './tipos';

function produto(id: string, nome: string, tipo_venda: Produto['tipo_venda'], preco: number | null): Produto {
  return { id, nome, categoria: 'Frutas', tipo_venda, preco, ativo: true, ordem: 0, atualizado_em: null };
}

const macaVerde = produto('p_0003', 'Maçã verde', 'kg', 2200);
const melancia = produto('p_0010', 'Melancia', 'peca', 2200);
const laranja = produto('p_0001', 'Laranja pêra', 'unidade', 50);
const morango = produto('p_0006', 'Morango', 'caixa', 6000);
const alface = produto('p_0018', 'Alface', 'unidade', null);

function aplicar(...acoes: AcaoNota[]): NotaEmMontagem {
  return acoes.reduce(reducerNota, NOTA_VAZIA);
}

const linha = (nota: NotaEmMontagem, id: string) => nota.linhas.find((l) => l.produtoId === id)!;

describe('nota de exemplo do README', () => {
  const nota = aplicar(
    { tipo: 'cliente', cliente: 'Mercadinho São José' },
    { tipo: 'adicionar', produto: macaVerde },
    { tipo: 'quantidade', produtoId: macaVerde.id, quantidade: 1200 },
    { tipo: 'adicionar', produto: melancia },
    { tipo: 'adicionar', produto: laranja },
    { tipo: 'quantidade', produtoId: laranja.id, quantidade: 20_000 },
    { tipo: 'adicionar', produto: morango },
    { tipo: 'adicionar', produto: morango },
  );

  it('soma R$ 178,40', () => {
    expect(nota.linhas.map((l) => valorFinal(l))).toEqual([2640, 2200, 1000, 12000]);
    expect(totalNota(nota)).toBe(17840);
    expect(podeGerar(nota)).toBe(true);
  });

  it('gera os itens no formato da aba Itens', () => {
    expect(paraItens(nota)[0]).toEqual({
      produto_id: 'p_0003',
      produto_nome: 'Maçã verde',
      tipo_venda: 'kg',
      quantidade: 1200,
      preco_unitario: 2200,
      valor_calculado: 2640,
      valor_final: 2640,
      ajustado: false,
    });
  });
});

describe('adicionar', () => {
  it('kg entra com peso vazio e não duplica', () => {
    const nota = aplicar({ tipo: 'adicionar', produto: macaVerde }, { tipo: 'adicionar', produto: macaVerde });
    expect(nota.linhas).toHaveLength(1);
    expect(nota.linhas[0].quantidade).toBe(0);
    expect(podeGerar(nota)).toBe(false);
  });

  it('outros tipos entram com 1 e somam 1 a cada toque', () => {
    const nota = aplicar(
      { tipo: 'adicionar', produto: laranja },
      { tipo: 'adicionar', produto: laranja },
      { tipo: 'adicionar', produto: laranja },
    );
    expect(nota.linhas).toHaveLength(1);
    expect(nota.linhas[0].quantidade).toBe(3000);
  });

  it('a mais recente fica embaixo', () => {
    const nota = aplicar({ tipo: 'adicionar', produto: laranja }, { tipo: 'adicionar', produto: melancia });
    expect(nota.linhas.map((l) => l.nome)).toEqual(['Laranja pêra', 'Melancia']);
  });
});

describe('contador − / +', () => {
  it('não passa de zero', () => {
    const nota = aplicar(
      { tipo: 'adicionar', produto: melancia },
      { tipo: 'somar', produtoId: melancia.id, delta: -1 },
      { tipo: 'somar', produtoId: melancia.id, delta: -1 },
    );
    expect(linha(nota, melancia.id).quantidade).toBe(0);
    expect(podeGerar(nota)).toBe(false);
  });
});

describe('ajuste manual do valor final', () => {
  const base = aplicar(
    { tipo: 'adicionar', produto: macaVerde },
    { tipo: 'quantidade', produtoId: macaVerde.id, quantidade: 1200 },
  );

  it('R$ 26,40 → R$ 26,00 marca ajustado e o total acompanha', () => {
    const nota = reducerNota(base, { tipo: 'valorFinal', produtoId: macaVerde.id, valor: 2600 });
    const l = linha(nota, macaVerde.id);
    expect(estaAjustada(l)).toBe(true);
    expect(totalNota(nota)).toBe(2600);
    expect(paraItens(nota)[0]).toMatchObject({ valor_calculado: 2640, valor_final: 2600, ajustado: true });
  });

  it('linha ajustada não recalcula ao mudar a quantidade', () => {
    const nota = aplicar(
      { tipo: 'adicionar', produto: macaVerde },
      { tipo: 'quantidade', produtoId: macaVerde.id, quantidade: 1200 },
      { tipo: 'valorFinal', produtoId: macaVerde.id, valor: 2600 },
      { tipo: 'quantidade', produtoId: macaVerde.id, quantidade: 1500 },
    );
    const l = linha(nota, macaVerde.id);
    expect(valorFinal(l)).toBe(2600);
    // O calculado novo fica disponível para a tela mostrar em cinza.
    expect(valorCalculado(l)).toBe(3300);
  });

  it('voltar ao calculado tira o ajuste', () => {
    const nota = aplicar(
      { tipo: 'adicionar', produto: macaVerde },
      { tipo: 'quantidade', produtoId: macaVerde.id, quantidade: 1200 },
      { tipo: 'valorFinal', produtoId: macaVerde.id, valor: 2600 },
      { tipo: 'voltarAoCalculado', produtoId: macaVerde.id },
    );
    const l = linha(nota, macaVerde.id);
    expect(estaAjustada(l)).toBe(false);
    expect(valorFinal(l)).toBe(2640);
  });

  it('digitar o mesmo valor do calculado não conta como ajuste', () => {
    const nota = reducerNota(base, { tipo: 'valorFinal', produtoId: macaVerde.id, valor: 2640 });
    expect(estaAjustada(linha(nota, macaVerde.id))).toBe(false);
  });
});

describe('preço só nesta nota', () => {
  it('muda o calculado da linha sem tocar no produto', () => {
    const nota = aplicar(
      { tipo: 'adicionar', produto: melancia },
      { tipo: 'preco', produtoId: melancia.id, preco: 2000 },
    );
    expect(valorFinal(linha(nota, melancia.id))).toBe(2000);
    expect(melancia.preco).toBe(2200);
  });
});

describe('produto sem preço', () => {
  it('bloqueia Gerar nota até informar o preço', () => {
    let nota = aplicar({ tipo: 'adicionar', produto: alface });
    expect(valorFinal(linha(nota, alface.id))).toBeNull();
    expect(podeGerar(nota)).toBe(false);
    expect(totalNota(nota)).toBe(0);
    nota = reducerNota(nota, { tipo: 'preco', produtoId: alface.id, preco: 300 });
    expect(podeGerar(nota)).toBe(true);
    expect(totalNota(nota)).toBe(300);
  });
});

describe('outros', () => {
  it('nota vazia não gera', () => {
    expect(podeGerar(NOTA_VAZIA)).toBe(false);
    expect(() => paraItens(NOTA_VAZIA)).toThrow();
  });

  it('cliente limitado a 60 caracteres', () => {
    const nota = aplicar({ tipo: 'cliente', cliente: 'x'.repeat(80) });
    expect(nota.cliente).toHaveLength(CLIENTE_MAX);
  });

  it('remover e limpar', () => {
    let nota = aplicar({ tipo: 'adicionar', produto: laranja }, { tipo: 'adicionar', produto: melancia });
    nota = reducerNota(nota, { tipo: 'remover', produtoId: laranja.id });
    expect(nota.linhas.map((l) => l.nome)).toEqual(['Melancia']);
    expect(reducerNota(nota, { tipo: 'limpar' })).toEqual(NOTA_VAZIA);
  });
});
