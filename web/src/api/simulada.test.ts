import { beforeEach, describe, expect, it } from 'vitest';
import { NOTA_VAZIA, paraItens, reducerNota, type AcaoNota } from '../dominio/nota';
import { ApiSimulada } from './simulada';

const AGORA = new Date('2026-10-16T17:30:00Z'); // 14:30 em João Pessoa

let api: ApiSimulada;

beforeEach(() => {
  api = new ApiSimulada({ latencia: 0, agora: () => AGORA });
});

async function notaExemplo() {
  const { produtos } = await api.getDadosIniciais();
  const p = (nome: string) => produtos.find((x) => x.nome === nome)!;
  const acoes: AcaoNota[] = [
    { tipo: 'cliente', cliente: 'Mercadinho São José' },
    { tipo: 'adicionar', produto: p('Maçã verde') },
    { tipo: 'quantidade', produtoId: p('Maçã verde').id, quantidade: 1200 },
    { tipo: 'valorFinal', produtoId: p('Maçã verde').id, valor: 2600 },
    { tipo: 'adicionar', produto: p('Melancia') },
  ];
  const nota = acoes.reduce(reducerNota, NOTA_VAZIA);
  return { cliente: nota.cliente, itens: paraItens(nota) };
}

describe('dados iniciais', () => {
  it('traz os 24 produtos e a config da loja', async () => {
    const { produtos, config } = await api.getDadosIniciais();
    expect(produtos).toHaveLength(24);
    expect(produtos.find((p) => p.nome === 'Morango')).toMatchObject({ tipo_venda: 'caixa', preco: 6000 });
    expect(produtos.find((p) => p.nome === 'Alface')?.preco).toBeNull();
    expect(config.vendedor).toBe('Léo');
  });

  it('devolve cópia, não o estado interno', async () => {
    const a = await api.getDadosIniciais();
    a.produtos[0].preco = 1;
    const b = await api.getDadosIniciais();
    expect(b.produtos[0].preco).toBe(50);
  });
});

describe('salvarNota', () => {
  it('numera em sequência e grava ajuste', async () => {
    const r1 = await api.salvarNota(await notaExemplo());
    const r2 = await api.salvarNota(await notaExemplo());
    expect([r1.numero, r2.numero]).toEqual([1, 2]);
    expect(r1.total).toBe(2600 + 2200);
    const nota = await api.getNota(1);
    expect(nota.itens[0]).toMatchObject({ valor_calculado: 2640, valor_final: 2600, ajustado: true });
  });

  it('recusa valor calculado que não confere', async () => {
    const nota = await notaExemplo();
    nota.itens[0].valor_calculado = 9999;
    await expect(api.salvarNota(nota)).rejects.toThrow('não confere');
  });

  it('sem internet, falha com mensagem em português', async () => {
    const nota = await notaExemplo();
    api.definirOffline(true);
    await expect(api.salvarNota(nota)).rejects.toThrow('Sem conexão');
    api.definirOffline(false);
    expect((await api.salvarNota(nota)).numero).toBe(1);
  });
});

describe('listar e cancelar', () => {
  it('mais recentes primeiro, com busca e paginação', async () => {
    for (let i = 0; i < 3; i++) await api.salvarNota(await notaExemplo());
    const pag = await api.listarNotas({ offset: 0, limite: 2 });
    expect(pag.notas.map((n) => n.numero)).toEqual([3, 2]);
    expect(pag.temMais).toBe(true);
    expect((await api.listarNotas({ busca: 'sao jose', offset: 0, limite: 50 })).notas).toHaveLength(3);
    expect((await api.listarNotas({ busca: '2', offset: 0, limite: 50 })).notas.map((n) => n.numero)).toEqual([2]);
  });

  it('cancelar muda status e guarda motivo; some do painel', async () => {
    await api.salvarNota(await notaExemplo());
    await api.cancelarNota(1, 'cliente desistiu');
    expect(await api.getNota(1)).toMatchObject({ status: 'cancelada', observacao: 'cliente desistiu' });
    expect((await api.getPainel('hoje')).atual.notas).toBe(0);
  });
});

describe('salvarProdutos', () => {
  it('altera preço com data e cria produto novo', async () => {
    const { produtos } = await api.getDadosIniciais();
    const maca = produtos.find((p) => p.nome === 'Maçã')!;
    const { id: _id, atualizado_em: _a, ...resto } = maca;
    const r = await api.salvarProdutos([
      { ...resto, id: maca.id, preco: 1800 },
      { nome: 'Pêssego', categoria: 'Frutas', tipo_venda: 'kg', preco: null, ativo: true, ordem: 25 },
    ]);
    expect(r.produtos.find((p) => p.id === maca.id)).toMatchObject({ preco: 1800, atualizado_em: AGORA.toISOString() });
    expect(r.produtos.at(-1)).toMatchObject({ id: 'p_0025', nome: 'Pêssego', atualizado_em: null });
  });
});

describe('armazenamento', () => {
  it('outra instância com a mesma chave enxerga as notas', async () => {
    const dados = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
    } as Storage;
    const a = new ApiSimulada({ latencia: 0, chaveArmazenamento: 'teste' });
    api = a;
    await a.salvarNota(await notaExemplo());
    const b = new ApiSimulada({ latencia: 0, chaveArmazenamento: 'teste' });
    expect((await b.getNota(1)).cliente).toBe('Mercadinho São José');
    expect((await b.salvarNota(await notaExemplo())).numero).toBe(2);
  });
});
