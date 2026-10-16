import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ItemNota } from '../web/src/dominio/tipos';
import {
  cancelarNota,
  doGet,
  getDadosIniciais,
  getNota,
  getPainel,
  listarNotas,
  salvarNota,
  salvarProdutos,
  setup,
} from './Code';
import { AbaFalsa, criarGoogleFalso, URL_APP, type PlanilhaFalsa } from './testes/falsos';

function instalarGoogleFalso(opcoes: { travaOcupada?: boolean; semAcesso?: boolean; email?: string } = {}) {
  const google = criarGoogleFalso({ ...opcoes, espiao: (fn) => vi.fn(fn) as never });
  for (const [nome, valor] of Object.entries(google.globais)) vi.stubGlobal(nome, valor);
  return google;
}

const AGORA = new Date('2026-10-16T17:30:00Z'); // 14:30 em João Pessoa

const macaVerde: ItemNota = {
  produto_id: 'p_0003',
  produto_nome: 'Maçã verde',
  tipo_venda: 'kg',
  quantidade: 1200,
  preco_unitario: 2200,
  valor_calculado: 2640,
  valor_final: 2600,
  ajustado: true,
};
const melancia: ItemNota = {
  produto_id: 'p_0010',
  produto_nome: 'Melancia',
  tipo_venda: 'peca',
  quantidade: 1000,
  preco_unitario: 2200,
  valor_calculado: 2200,
  valor_final: 2200,
  ajustado: false,
};

let ss: PlanilhaFalsa;
let trava: ReturnType<typeof instalarGoogleFalso>['trava'];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AGORA);
  ({ ss, trava } = instalarGoogleFalso());
  setup();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const config = (chave: string) => ss.aba('Config').objetos().find((c) => c.chave === chave)?.valor;

describe('setup', () => {
  it('cria as abas, os produtos e a config', () => {
    expect(ss.getSheets().map((a) => a.getName())).toEqual(['Produtos', 'Notas', 'Itens', 'Config']);
    expect(ss.fuso).toBe('America/Fortaleza');
    expect(ss.localidade).toBe('pt_BR');
    expect(ss.aba('Notas').linhas[0]).toEqual(['numero', 'data_hora', 'cliente', 'total', 'qtd_itens', 'status', 'observacao']);
    const produtos = ss.aba('Produtos').objetos();
    expect(produtos).toHaveLength(24);
    expect(produtos[2]).toMatchObject({ id: 'p_0003', nome: 'Maçã verde', tipo_venda: 'kg', preco: 22, ativo: true, ordem: 3 });
    expect(produtos.find((p) => p.nome === 'Alface')?.preco).toBe('');
    expect(config('telefone')).toBe('(83) 99911-7487');
    expect(config('proximo_numero')).toBe(1);
    expect(ss.aba('Itens').linhasCongeladas).toBe(1);
  });

  it('rodar de novo não duplica nada', () => {
    expect(setup()).toBe('A planilha já estava pronta. Nada mudou.');
    expect(ss.aba('Produtos').objetos()).toHaveLength(24);
    expect(ss.aba('Config').objetos()).toHaveLength(7);
  });

  it('acrescenta coluna que falta no fim, sem mexer nas outras', () => {
    const notas = ss.aba('Notas');
    notas.linhas = [['numero', 'cliente', 'minha coluna']];
    setup();
    expect(notas.linhas[0]).toEqual([
      'numero', 'cliente', 'minha coluna', 'data_hora', 'total', 'qtd_itens', 'status', 'observacao',
    ]);
  });

  it('próximo número parte da maior nota existente se a config sumir', () => {
    salvarNota({ cliente: '', itens: [melancia] });
    salvarNota({ cliente: '', itens: [melancia] });
    const cfg = ss.aba('Config');
    cfg.linhas = cfg.linhas.filter((l) => l[0] !== 'proximo_numero');
    setup();
    expect(config('proximo_numero')).toBe(3);
  });
});

describe('getDadosIniciais', () => {
  it('lê produtos em centavos e a config', () => {
    const { produtos, config: cfg } = getDadosIniciais();
    expect(produtos).toHaveLength(24);
    expect(produtos.find((p) => p.nome === 'Morango')).toMatchObject({ tipo_venda: 'caixa', preco: 6000, ativo: true });
    expect(produtos.find((p) => p.nome === 'Alface')?.preco).toBeNull();
    expect(cfg).toMatchObject({ vendedor: 'Léo', rodape_nota: 'Documento sem valor fiscal.' });
  });

  it('aceita o que a família digita à mão', () => {
    const aba = ss.aba('Produtos');
    const cab = aba.linhas[0];
    const linha = aba.linhas[1]; // Laranja pêra
    linha[cab.indexOf('preco')] = '0,60';
    linha[cab.indexOf('tipo_venda')] = 'Un.';
    linha[cab.indexOf('ativo')] = 'sim';
    aba.linhas.push(['', 'linha pela metade']);
    const p = getDadosIniciais().produtos;
    expect(p[0]).toMatchObject({ nome: 'Laranja pêra', preco: 60, tipo_venda: 'unidade', ativo: true });
    expect(p).toHaveLength(24);
  });

  it('funciona com as colunas em outra ordem', () => {
    const aba = ss.aba('Produtos');
    const ordem = [7, 6, 5, 4, 3, 2, 1, 0];
    aba.linhas = aba.linhas.map((l) => ordem.map((j) => l[j] ?? ''));
    expect(getDadosIniciais().produtos[2]).toMatchObject({ id: 'p_0003', nome: 'Maçã verde', preco: 2200 });
  });
});

describe('salvarNota', () => {
  it('grava nota e itens, numera em sequência (critério de aceite)', () => {
    const r1 = salvarNota({ cliente: 'Mercadinho São José', itens: [macaVerde, melancia] });
    const r2 = salvarNota({ cliente: '', itens: [melancia] });
    expect(r1).toEqual({ numero: 1, data_hora: AGORA.toISOString(), total: 4800 });
    expect(r2.numero).toBe(2);

    expect(ss.aba('Notas').objetos()[0]).toMatchObject({
      numero: 1, cliente: 'Mercadinho São José', total: 48, qtd_itens: 2, status: 'emitida', observacao: '',
    });
    expect(ss.aba('Notas').objetos()[0].data_hora).toEqual(AGORA);
    expect(ss.aba('Itens').objetos()[0]).toEqual({
      numero_nota: 1,
      produto_id: 'p_0003',
      produto_nome: 'Maçã verde',
      tipo_venda: 'kg',
      quantidade: 1.2,
      preco_unitario: 22,
      valor_calculado: 26.4,
      valor_final: 26,
      ajustado: true,
    });
    expect(config('proximo_numero')).toBe(3);
    expect(trava.releaseLock).toHaveBeenCalledTimes(2);
  });

  it('recusa valor calculado que não confere, sem gravar nada', () => {
    expect(() => salvarNota({ cliente: '', itens: [{ ...macaVerde, valor_calculado: 1 }] })).toThrow('não confere');
    expect(ss.aba('Notas').objetos()).toHaveLength(0);
    expect(ss.aba('Itens').objetos()).toHaveLength(0);
  });

  it('com a planilha ocupada, avisa e não grava', () => {
    ({ ss, trava } = instalarGoogleFalso({ travaOcupada: true }));
    // A planilha nova precisa das abas, mas o setup não usa trava.
    setup();
    expect(() => salvarNota({ cliente: '', itens: [melancia] })).toThrow('ocupada');
    expect(ss.aba('Notas').objetos()).toHaveLength(0);
  });

  it('nunca reaproveita número se alguém baixar o próximo à mão', () => {
    salvarNota({ cliente: '', itens: [melancia] });
    salvarNota({ cliente: '', itens: [melancia] });
    const cfg = ss.aba('Config');
    cfg.linhas.find((l) => l[0] === 'proximo_numero')![1] = 1;
    expect(salvarNota({ cliente: '', itens: [melancia] }).numero).toBe(3);
  });

  it('cliente que parece fórmula vai como texto', () => {
    const definir = vi.spyOn(AbaFalsa.prototype, 'definir');
    salvarNota({ cliente: '=HYPERLINK("x")', itens: [melancia] });
    expect(definir).toHaveBeenCalledWith(2, 3, '\'=HYPERLINK("x")');
    expect(getNota(1).cliente).toBe('=HYPERLINK("x")');
  });
});

describe('listar, abrir e cancelar notas', () => {
  beforeEach(() => {
    salvarNota({ cliente: 'Mercadinho São José', itens: [macaVerde] });
    salvarNota({ cliente: 'Dona Maria', itens: [melancia] });
    salvarNota({ cliente: 'Mercadinho São José', itens: [melancia, macaVerde] });
  });

  it('mais recentes primeiro, com busca e paginação', () => {
    expect(listarNotas({ offset: 0, limite: 2 })).toMatchObject({
      notas: [{ numero: 3 }, { numero: 2 }],
      temMais: true,
    });
    expect(listarNotas({ busca: 'sao jose', offset: 0, limite: 50 }).notas.map((n) => n.numero)).toEqual([3, 1]);
    expect(listarNotas({ desde: '2026-10-17T00:00:00Z', offset: 0, limite: 50 }).notas).toHaveLength(0);
  });

  it('getNota traz os itens em centavos e milésimos', () => {
    const nota = getNota(3);
    expect(nota).toMatchObject({ numero: 3, total: 4800, qtd_itens: 2, status: 'emitida' });
    expect(nota.itens).toEqual([melancia, macaVerde]);
    expect(() => getNota(99)).toThrow('Nota 99 não encontrada.');
  });

  it('cancelar muda status, guarda motivo e tira do painel', () => {
    expect(getPainel('hoje').atual).toMatchObject({ notas: 3, vendas: 2600 + 2200 + 4800 });
    cancelarNota(3, 'cliente desistiu');
    expect(getNota(3)).toMatchObject({ status: 'cancelada', observacao: 'cliente desistiu' });
    expect(ss.aba('Notas').objetos()).toHaveLength(3); // nunca apaga
    expect(getPainel('hoje').atual).toMatchObject({ notas: 2, vendas: 2600 + 2200 });
  });
});

describe('salvarProdutos', () => {
  it('muda preço com data, mantém data se o preço não mudou, cria novo', () => {
    const { produtos } = getDadosIniciais();
    const semData = ({ id: _i, atualizado_em: _a, ...resto }: (typeof produtos)[number]) => resto;
    const maca = produtos.find((p) => p.nome === 'Maçã')!;
    const kiwi = produtos.find((p) => p.nome === 'Kiwi')!;

    const r = salvarProdutos([
      { ...semData(maca), id: maca.id, preco: 1850 },
      { ...semData(kiwi), id: kiwi.id, ativo: false },
      { nome: 'Pêssego', categoria: 'Frutas', tipo_venda: 'kg', preco: null, ativo: true, ordem: 25 },
    ]);

    expect(r.produtos.find((p) => p.id === maca.id)).toMatchObject({ preco: 1850, atualizado_em: AGORA.toISOString() });
    expect(r.produtos.find((p) => p.id === kiwi.id)).toMatchObject({ ativo: false, atualizado_em: null });
    expect(r.produtos.at(-1)).toMatchObject({ id: 'p_0025', nome: 'Pêssego', preco: null, atualizado_em: null });
    expect(ss.aba('Produtos').objetos().find((p) => p.id === maca.id)?.preco).toBe(18.5);
  });

  it('recusa dados inválidos antes de gravar', () => {
    expect(() =>
      salvarProdutos([{ nome: '', categoria: 'Frutas', tipo_venda: 'kg', preco: null, ativo: true, ordem: 1 }]),
    ).toThrow('sem nome');
    expect(() =>
      salvarProdutos([{ id: 'p_9999', nome: 'X', categoria: 'Frutas', tipo_venda: 'kg', preco: null, ativo: true, ordem: 1 }]),
    ).toThrow('não encontrado');
  });
});

describe('getPainel', () => {
  it('recusa período desconhecido', () => {
    expect(() => getPainel('ano' as never)).toThrow('Período inválido.');
  });
});

describe('doGet', () => {
  it('serve o app com o endereço e os parâmetros injetados', () => {
    const saida = doGet({ parameter: {} } as never) as unknown as {
      getContent(): string;
      titulo: string;
      metas: Record<string, string>;
    };
    expect(saida.getContent()).toContain(
      `<head><script>window.LEO_FRUTAS={"urlApp":"${URL_APP}","parametros":{"view":"","numero":""}};</script>`,
    );
    expect(saida.titulo).toBe('Léo Frutas');
    expect(saida.metas.viewport).toBe('width=device-width, initial-scale=1');
  });

  it('view de impressão leva o número e o título da nota', () => {
    const saida = doGet({ parameter: { view: 'nota', numero: '128' } } as never) as unknown as {
      getContent(): string;
      titulo: string;
    };
    expect(saida.getContent()).toContain('"parametros":{"view":"nota","numero":"128"}');
    expect(saida.titulo).toBe('Nota 0128 · Léo Frutas');
  });

  it('ignora parâmetros estranhos', () => {
    const saida = doGet({ parameter: { view: '<script>', numero: '1;alert(1)' } } as never) as unknown as {
      getContent(): string;
    };
    expect(saida.getContent()).toContain('"parametros":{"view":"","numero":""}');
  });
});

describe('acesso pela conta de quem abre', () => {
  it('sem permissão na planilha, doGet mostra uma página explicando', () => {
    instalarGoogleFalso({ semAcesso: true, email: 'curioso@gmail.com' });
    const saida = doGet({ parameter: {} } as never) as unknown as { getContent(): string; titulo: string };
    expect(saida.titulo).toBe('Sem acesso · Léo Frutas');
    expect(saida.getContent()).toContain('Você entrou como <strong>curioso@gmail.com</strong>');
    expect(saida.getContent()).not.toContain('LEO_FRUTAS');
  });

  it('e-mail com HTML não vira código na página', () => {
    instalarGoogleFalso({ semAcesso: true, email: '<b>x</b>@gmail.com' });
    const saida = doGet({ parameter: {} } as never) as unknown as { getContent(): string };
    expect(saida.getContent()).toContain('&lt;b&gt;x&lt;/b&gt;@gmail.com');
  });

  it('funções da API trocam o erro do Google por mensagem em português', () => {
    instalarGoogleFalso({ semAcesso: true });
    expect(() => getDadosIniciais()).toThrow('Sua conta não tem permissão na planilha da Léo Frutas.');
    expect(() => salvarNota({ cliente: '', itens: [melancia] })).toThrow('Sua conta não tem permissão');
  });

  it('outros erros passam como estão', () => {
    expect(() => getNota(42)).toThrow('Nota 42 não encontrada.');
  });
});
