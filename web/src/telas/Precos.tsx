import { GripVertical, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Aviso, useAviso } from '../componentes/Aviso';
import { CampoNumerico } from '../componentes/CampoNumerico';
import { FormularioProduto, type DadosFormulario } from '../componentes/FormularioProduto';
import { Interruptor } from '../componentes/Interruptor';
import { Selo } from '../componentes/Selo';
import { useArrastarLinhas } from '../componentes/useArrastarLinhas';
import { formatarCentavosCampo, formatarDataHora, lerDinheiro, rotuloUnidade } from '../dominio/formatacao';
import {
  ABAS,
  aplicarPendentes,
  filtrarProdutos,
  paraAlteracao,
  proximaOrdem,
  registrarMudanca,
  reordenarProdutos,
  type Aba,
  type CamposEditaveis,
  type Pendentes,
} from '../dominio/produtos';
import type { Produto } from '../dominio/tipos';
import '../estilos/precos.css';

interface Props {
  produtos: Produto[] | null;
  erroDados: string | null;
  aoAtualizarProdutos: (produtos: Produto[]) => void;
  /** Quantos produtos têm alteração não salva (para avisar ao sair da tela). */
  aoMudarPendencias: (quantos: number) => void;
}

type Formulario = { produto?: Produto } | null;

export function Precos({ produtos, erroDados, aoAtualizarProdutos, aoMudarPendencias }: Props) {
  const [pendentes, setPendentes] = useState<Pendentes>(new Map());
  const [aba, setAba] = useState<Aba>('Todos');
  const [busca, setBusca] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [formulario, setFormulario] = useState<Formulario>(null);
  const [focarAlca, setFocarAlca] = useState<string | null>(null);
  const { aviso, mostrar } = useAviso();

  useEffect(() => aoMudarPendencias(pendentes.size), [pendentes.size, aoMudarPendencias]);
  useEffect(() => () => aoMudarPendencias(0), [aoMudarPendencias]);

  const vista = useMemo(() => aplicarPendentes(produtos ?? [], pendentes), [produtos, pendentes]);
  const visiveis = useMemo(
    () => filtrarProdutos(vista, aba, busca, { incluirInativos: true }),
    [vista, aba, busca],
  );

  function mudar(id: string, campos: Partial<CamposEditaveis>) {
    const original = produtos?.find((p) => p.id === id);
    if (original) setPendentes((atual) => registrarMudanca(atual, original, campos));
  }

  function reordenar(de: number, para: number) {
    for (const { id, ordem } of reordenarProdutos(visiveis, de, para)) mudar(id, { ordem });
  }

  const arrasto = useArrastarLinhas(visiveis.length, reordenar);

  // Pelo teclado (setas na alça), o foco acompanha o produto que mudou de lugar.
  useEffect(() => {
    if (!focarAlca) return;
    document.querySelector<HTMLElement>(`[data-alca="${focarAlca}"]`)?.focus();
    setFocarAlca(null);
  }, [focarAlca, visiveis]);

  async function salvar() {
    const alteracoes = [...pendentes.keys()]
      .map((id) => vista.find((p) => p.id === id))
      .filter((p): p is Produto => !!p)
      .map(paraAlteracao);
    setSalvando(true);
    setErro(null);
    try {
      const r = await api.salvarProdutos(alteracoes);
      aoAtualizarProdutos(r.produtos);
      setPendentes(new Map());
      mostrar('Preços salvos na planilha');
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  }

  async function salvarFormulario(dados: DadosFormulario, produto?: Produto) {
    const atual = produto && vista.find((p) => p.id === produto.id);
    const alteracao = atual
      ? paraAlteracao({ ...atual, ...dados })
      : { ...dados, ativo: true, ordem: proximaOrdem(vista) };
    // Erro sobe para o formulário, que mostra a mensagem e continua aberto.
    const r = await api.salvarProdutos([alteracao]);
    aoAtualizarProdutos(r.produtos);
    if (atual) {
      setPendentes((p) => {
        const novo = new Map(p);
        novo.delete(atual.id);
        return novo;
      });
    }
    setFormulario(null);
    mostrar(atual ? 'Produto salvo na planilha' : `${dados.nome} cadastrado`);
  }

  const qtdPendentes = pendentes.size;

  return (
    <div className="precos">
      <header className="topo precos__topo">
        <h1 className="topo__titulo">Preços</h1>
        <div className="precos__acoes">
          <button type="button" className="botao botao--secundario" onClick={() => setFormulario({})}>
            <Plus size={18} aria-hidden /> Novo produto
          </button>
          <button
            type="button"
            className="botao botao--principal"
            disabled={qtdPendentes === 0 || salvando}
            onClick={salvar}
          >
            {salvando
              ? 'Salvando…'
              : qtdPendentes
                ? `Salvar preços (${qtdPendentes})`
                : 'Salvar preços'}
          </button>
        </div>
      </header>

      <div className="tela precos__corpo">
        {erro && (
          <div className="faixa-erro" role="alert">
            <span className="faixa-erro__texto">{erro}</span>
            <button type="button" className="botao botao--secundario" onClick={salvar}>
              Tentar de novo
            </button>
          </div>
        )}

        <div className="precos__filtros">
          <div className="abas abas--sem-recuo" role="tablist" aria-label="Categorias">
            {ABAS.map((a) => (
              <button
                key={a}
                type="button"
                role="tab"
                className="aba"
                aria-selected={!busca && a === aba}
                onClick={() => {
                  setAba(a);
                  setBusca('');
                }}
              >
                {a}
              </button>
            ))}
          </div>
          <label className="busca precos__busca">
            <span className="sr-only">Buscar produto</span>
            <input
              type="search"
              className="busca__campo"
              placeholder="Buscar produto…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            {busca ? (
              <button type="button" className="busca__limpar" aria-label="Limpar busca" onClick={() => setBusca('')}>
                <X size={18} aria-hidden />
              </button>
            ) : (
              <Search className="busca__icone" size={18} aria-hidden />
            )}
          </label>
        </div>

        <div className="cartao precos__cartao">
          {erroDados ? (
            <p className="texto-erro">{erroDados}</p>
          ) : !produtos ? (
            <p className="texto-fraco">Carregando produtos…</p>
          ) : visiveis.length === 0 ? (
            <p className="texto-fraco">Nenhum produto encontrado{busca && ` para “${busca}”`}.</p>
          ) : (
            <table className={`tabela-precos${arrasto.estado ? ' tabela-precos--arrastando' : ''}`}>
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Mover</span>
                  </th>
                  <th>Produto</th>
                  <th>Categoria</th>
                  <th>Vende por</th>
                  <th className="tabela-precos__num">Preço</th>
                  <th>Atualizado em</th>
                  <th>Ativo</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p, i) => {
                  const pendente = pendentes.get(p.id);
                  const arrastada = arrasto.estado?.de === i;
                  const deslocamento = arrasto.deslocamento(i);
                  return (
                    <tr
                      key={p.id}
                      ref={arrasto.registrar(i)}
                      style={deslocamento ? { transform: `translateY(${deslocamento}px)` } : undefined}
                      className={[
                        pendente && 'tabela-precos__alterada',
                        !p.ativo && 'tabela-precos__inativa',
                        arrastada && 'tabela-precos__arrastada',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <td className="tabela-precos__alca-celula">
                        <button
                          type="button"
                          className="tabela-precos__alca"
                          data-alca={p.id}
                          aria-label={`Mover ${p.nome}. Arraste para cima ou para baixo, ou use as setas do teclado`}
                          disabled={salvando}
                          {...arrasto.propsAlca(i)}
                          onKeyDown={(e) => {
                            const para = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null;
                            if (para === null || para < 0 || para >= visiveis.length) return;
                            e.preventDefault();
                            reordenar(i, para);
                            setFocarAlca(p.id);
                          }}
                        >
                          <GripVertical size={20} aria-hidden />
                        </button>
                      </td>
                      <td data-rotulo="Produto">
                        <button
                          type="button"
                          className="tabela-precos__nome"
                          aria-label={`Editar ${p.nome}`}
                          onClick={() => setFormulario({ produto: p })}
                        >
                          {p.nome}
                        </button>
                      </td>
                      <td data-rotulo="Categoria" className="tabela-precos__categoria">
                        {p.categoria}
                      </td>
                      <td data-rotulo="Vende por">
                        <Selo tipo={p.tipo_venda} />
                      </td>
                      <td data-rotulo="Preço" className="tabela-precos__num">
                        <span className="tabela-precos__preco">
                          <span className="tabela-precos__rs" aria-hidden>
                            R$
                          </span>
                          <CampoNumerico
                            aria-label={`Preço de ${p.nome}`}
                            inputMode="decimal"
                            placeholder="definir"
                            disabled={salvando}
                            exibido={p.preco === null ? '' : formatarCentavosCampo(p.preco)}
                            aoConfirmar={(t) => {
                              if (t.trim() === '') return mudar(p.id, { preco: null });
                              const preco = lerDinheiro(t);
                              if (preco !== null) mudar(p.id, { preco });
                            }}
                          />
                          <span className="tabela-precos__unidade">/{rotuloUnidade(p.tipo_venda)}</span>
                        </span>
                      </td>
                      <td data-rotulo="Atualizado em" className="tabela-precos__data tabular">
                        {pendente ? (
                          <span className="tabela-precos__nao-salvo">não salvo</span>
                        ) : p.atualizado_em ? (
                          formatarDataHora(p.atualizado_em)
                        ) : (
                          '—'
                        )}
                      </td>
                      <td data-rotulo="Ativo">
                        <Interruptor
                          ligado={p.ativo}
                          rotulo={`${p.nome} ativo`}
                          desativado={salvando}
                          aoMudar={(ativo) => mudar(p.id, { ativo })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {formulario && (
        <FormularioProduto
          produto={formulario.produto}
          aoFechar={() => setFormulario(null)}
          aoSalvar={(dados) => salvarFormulario(dados, formulario.produto)}
        />
      )}
      <Aviso aviso={aviso} />
    </div>
  );
}
