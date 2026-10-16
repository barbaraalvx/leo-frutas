import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { GraficoVendas } from '../componentes/GraficoVendas';
import { formatarDinheiro, formatarQuantidade, rotuloUnidade } from '../dominio/formatacao';
import {
  diaLocal,
  intervaloDoPeriodo,
  ROTULOS_PERIODO,
  rotuloComparacao,
  variacao,
  type Painel as DadosPainel,
  type Periodo,
} from '../dominio/painel';
import '../estilos/painel.css';

const PERIODOS = Object.keys(ROTULOS_PERIODO) as Periodo[];

export function Painel() {
  const [periodo, setPeriodo] = useState<Periodo>('hoje');
  const [painel, setPainel] = useState<DadosPainel | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const pedido = useRef(0);

  const carregar = useCallback(async () => {
    const meu = ++pedido.current;
    setCarregando(true);
    setErro(null);
    try {
      const r = await api.getPainel(periodo);
      if (meu === pedido.current) setPainel(r);
    } catch (e) {
      if (meu === pedido.current) setErro(e instanceof Error ? e.message : String(e));
    } finally {
      if (meu === pedido.current) setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const hoje = diaLocal(new Date());
  const comparacao = rotuloComparacao(periodo, hoje);

  return (
    <div className="painel">
      <header className="painel__topo">
        <h1 className="topo__titulo">Painel</h1>
        <div className="abas abas--sem-recuo" role="tablist" aria-label="Período">
          {PERIODOS.map((p) => (
            <button
              key={p}
              type="button"
              role="tab"
              className="aba"
              aria-selected={p === periodo}
              onClick={() => setPeriodo(p)}
            >
              {ROTULOS_PERIODO[p]}
            </button>
          ))}
        </div>
      </header>

      <div className="tela painel__corpo">
        {erro && (
          <div className="faixa-erro" role="alert">
            <span className="faixa-erro__texto">{erro}</span>
            <button type="button" className="botao botao--secundario" onClick={carregar}>
              Tentar de novo
            </button>
          </div>
        )}

        {!painel ? (
          !erro && <p className="texto-fraco">Carregando números…</p>
        ) : (
          // Ao trocar de período, os números antigos ficam esmaecidos até chegar os novos.
          <div className={`painel__conteudo${carregando ? ' painel__conteudo--carregando' : ''}`} aria-busy={carregando}>
            <div className="indicadores">
              <Indicador
                rotulo="Vendas"
                valor={formatarDinheiro(painel.atual.vendas)}
                delta={<Delta atual={painel.atual.vendas} anterior={painel.anterior.vendas} comparacao={comparacao} />}
              />
              <Indicador
                rotulo="Notas"
                valor={String(painel.atual.notas)}
                delta={<Delta atual={painel.atual.notas} anterior={painel.anterior.notas} comparacao={comparacao} />}
              />
              <Indicador
                rotulo="Ticket médio"
                valor={formatarDinheiro(painel.atual.ticketMedio)}
                delta={
                  <Delta
                    atual={painel.atual.ticketMedio}
                    anterior={painel.anterior.ticketMedio}
                    comparacao={comparacao}
                  />
                }
              />
              <Indicador
                rotulo="Mais vendido"
                valor={painel.maisVendido?.nome ?? '—'}
                valorTexto
                delta={
                  <span className="indicador__detalhe">
                    {painel.maisVendido
                      ? `${formatarDinheiro(painel.maisVendido.valor)} · ${formatarQuantidade(painel.maisVendido.tipo_venda, painel.maisVendido.quantidade)} ${rotuloUnidade(painel.maisVendido.tipo_venda)}`
                      : 'Nenhuma venda no período'}
                  </span>
                }
              />
            </div>

            <section className="cartao painel__secao" aria-labelledby="titulo-grafico">
              <h2 id="titulo-grafico" className="painel__subtitulo">
                Vendas por dia
              </h2>
              <GraficoVendas porDia={painel.porDia} inicioPeriodo={intervaloDoPeriodo(periodo, hoje).inicio} />
            </section>

            <section className="cartao painel__secao" aria-labelledby="titulo-top">
              <h2 id="titulo-top" className="painel__subtitulo">
                Produtos que mais venderam
              </h2>
              {painel.topProdutos.length === 0 ? (
                <p className="texto-fraco">Nenhuma venda no período.</p>
              ) : (
                <table className="top-produtos">
                  <thead>
                    <tr>
                      <th>
                        <span className="sr-only">Posição</span>
                      </th>
                      <th>Produto</th>
                      <th className="tabela__num">Quantidade</th>
                      <th className="tabela__num">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {painel.topProdutos.map((p, i) => (
                      <tr key={p.produto_id}>
                        <td className="top-produtos__posicao tabular">{i + 1}</td>
                        <td className="top-produtos__nome">{p.nome}</td>
                        <td className="tabela__num tabular">
                          {formatarQuantidade(p.tipo_venda, p.quantidade)} {rotuloUnidade(p.tipo_venda)}
                        </td>
                        <td className="tabela__num tabular top-produtos__valor">{formatarDinheiro(p.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

interface PropsIndicador {
  rotulo: string;
  valor: string;
  /** Nome de produto em vez de número: fonte menor, até 2 linhas. */
  valorTexto?: boolean;
  delta: React.ReactNode;
}

function Indicador({ rotulo, valor, valorTexto, delta }: PropsIndicador) {
  return (
    <div className="cartao indicador">
      <span className="indicador__rotulo">{rotulo}</span>
      <span className={`indicador__valor${valorTexto ? ' indicador__valor--texto' : ''}`}>{valor}</span>
      {delta}
    </div>
  );
}

/** Variação em verde ou vermelho, sempre com seta e texto (nunca só a cor). */
function Delta({ atual, anterior, comparacao }: { atual: number; anterior: number; comparacao: string }) {
  const v = variacao(atual, anterior);
  if (!v) return <span className="indicador__delta">Sem vendas para comparar</span>;
  if (v.tipo === 'sem-base') return <span className="indicador__delta">Nada no período anterior</span>;
  const { valor } = v;
  const Icone = valor > 0 ? TrendingUp : valor < 0 ? TrendingDown : Minus;
  const classe = valor > 0 ? ' indicador__delta--alta' : valor < 0 ? ' indicador__delta--queda' : '';
  const texto = `${valor > 0 ? '+' : valor < 0 ? '−' : ''}${Math.abs(valor)}%`;
  return (
    <span className={`indicador__delta${classe}`}>
      <Icone size={16} aria-hidden />
      <span>
        {texto} {comparacao}
      </span>
    </span>
  );
}
