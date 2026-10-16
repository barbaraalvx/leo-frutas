import { Receipt, Search, X } from 'lucide-react';
import { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { api, type DadosIniciais } from '../api';
import { lerRascunho, salvarRascunho } from '../armazenamento';
import { Aviso, useAviso } from '../componentes/Aviso';
import { CartaoProduto } from '../componentes/CartaoProduto';
import { LinhaNota, type PedidoDeFoco } from '../componentes/LinhaNota';
import { MIL } from '../dominio/calculo';
import { formatarDinheiro, formatarNumeroNota } from '../dominio/formatacao';
import { CLIENTE_MAX, paraItens, podeGerar, reducerNota, totalNota } from '../dominio/nota';
import { ABAS, filtrarProdutos, type Aba } from '../dominio/produtos';
import type { Nota, Produto } from '../dominio/tipos';
import '../estilos/nova-nota.css';
import { PreVisualizacao } from './PreVisualizacao';

interface Props {
  dados: DadosIniciais | null;
  erroDados: string | null;
}

type Envio = { estado: 'ocioso' } | { estado: 'salvando' } | { estado: 'erro'; mensagem: string };

function novoIdEnvio(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Abaixo disso a nota vira gaveta (README, "Tablet em pé / celular"). */
const TELA_ESTREITA = '(max-width: 1023px)';

export function NovaNota({ dados, erroDados }: Props) {
  const [nota, despachar] = useReducer(reducerNota, undefined, lerRascunho);
  const [aba, setAba] = useState<Aba>('Frutas');
  const [busca, setBusca] = useState('');
  const [foco, setFoco] = useState<(PedidoDeFoco & { produtoId: string }) | null>(null);
  const [envio, setEnvio] = useState<Envio>({ estado: 'ocioso' });
  const [notaGerada, setNotaGerada] = useState<Nota | null>(null);
  const [confirmarLimpar, setConfirmarLimpar] = useState(false);
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const { aviso, mostrar } = useAviso();
  const refLinhas = useRef<HTMLUListElement>(null);
  const qtdLinhasAntes = useRef(nota.linhas.length);
  // Mesmo id em todas as tentativas desta nota; qualquer mudança gera outro.
  const idEnvio = useRef<string | null>(null);

  const salvando = envio.estado === 'salvando';
  const total = totalNota(nota);
  const pronta = podeGerar(nota);

  useEffect(() => {
    salvarRascunho(nota);
    idEnvio.current = null;
  }, [nota]);

  // Linha nova entra embaixo: rola para ela aparecer.
  useEffect(() => {
    if (nota.linhas.length > qtdLinhasAntes.current && refLinhas.current) {
      refLinhas.current.scrollTop = refLinhas.current.scrollHeight;
    }
    qtdLinhasAntes.current = nota.linhas.length;
  }, [nota.linhas.length]);

  const produtos = useMemo(
    () => (dados ? filtrarProdutos(dados.produtos, aba, busca) : []),
    [dados, aba, busca],
  );

  const naNota = useMemo(() => {
    const mapa = new Map<string, number | boolean>();
    for (const l of nota.linhas) mapa.set(l.produtoId, l.tipo === 'kg' ? true : l.quantidade / MIL);
    return mapa;
  }, [nota.linhas]);

  function tocarProduto(produto: Produto) {
    if (salvando) return;
    const jaEstava = naNota.has(produto.id);
    despachar({ tipo: 'adicionar', produto });
    const campo =
      produto.tipo_venda === 'kg' ? 'quantidade' : !jaEstava && produto.preco === null ? 'preco' : null;
    if (campo) {
      setFoco((f) => ({ produtoId: produto.id, campo, vez: (f?.vez ?? 0) + 1 }));
      if (window.matchMedia(TELA_ESTREITA).matches) setGavetaAberta(true);
    }
  }

  async function gerar() {
    if (!pronta || salvando) return;
    const itens = paraItens(nota);
    const cliente = nota.cliente.trim();
    idEnvio.current ??= novoIdEnvio();
    setEnvio({ estado: 'salvando' });
    try {
      const r = await api.salvarNota({ cliente, itens, id_envio: idEnvio.current });
      setNotaGerada({
        numero: r.numero,
        data_hora: r.data_hora,
        cliente,
        total: r.total,
        qtd_itens: itens.length,
        status: 'emitida',
        observacao: '',
        itens,
      });
      // A nota está na planilha: o rascunho pode ir embora.
      despachar({ tipo: 'limpar' });
      setEnvio({ estado: 'ocioso' });
      setGavetaAberta(false);
      mostrar(`Nota ${formatarNumeroNota(r.numero)} salva na planilha`);
    } catch (e) {
      setEnvio({ estado: 'erro', mensagem: e instanceof Error ? e.message : String(e) });
    }
  }

  if (notaGerada && dados) {
    const voltar = () => setNotaGerada(null);
    return (
      <>
        <PreVisualizacao
          nota={notaGerada}
          config={dados.config}
          aoVoltar={voltar}
          acoes={
            <button type="button" className="botao botao--principal" onClick={voltar}>
              <Receipt size={18} aria-hidden /> Nova nota
            </button>
          }
        />
        <Aviso aviso={aviso} />
      </>
    );
  }

  const qtdItens = nota.linhas.length;

  return (
    <div className="nova-nota">
      <section className="grade" aria-label="Produtos">
        <header className="topo grade__topo">
          <span className="grade__marca">Léo Frutas</span>
          <label className="busca">
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
        </header>

        <div className="abas" role="tablist" aria-label="Categorias">
          {ABAS.map((a) => (
            <button
              key={a}
              type="button"
              role="tab"
              className="aba"
              // Com busca, a procura é em todas as categorias: nenhuma aba fica ativa.
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

        <div className="grade__produtos">
          {erroDados ? (
            <p className="texto-erro">{erroDados}</p>
          ) : !dados ? (
            <p className="texto-fraco">Carregando produtos…</p>
          ) : produtos.length === 0 ? (
            <p className="texto-fraco">Nenhum produto encontrado{busca && ` para “${busca}”`}.</p>
          ) : (
            produtos.map((p) => (
              <CartaoProduto
                key={p.id}
                produto={p}
                naNota={naNota.get(p.id) ?? false}
                aoTocar={tocarProduto}
                desativado={salvando}
              />
            ))
          )}
        </div>
      </section>

      <aside className={`nota${gavetaAberta ? ' nota--aberta' : ''}`} aria-label="Nota">
        <header className="nota__cabecalho">
          <h2 className="nota__titulo">Nova nota</h2>
          <button
            type="button"
            className="botao botao--icone nota__fechar"
            aria-label="Fechar nota"
            onClick={() => setGavetaAberta(false)}
          >
            <X size={20} aria-hidden />
          </button>
        </header>

        <fieldset className="nota__campos" disabled={salvando}>
          <label className="nota__cliente">
            <span className="rotulo">Cliente</span>
            <input
              className="campo"
              placeholder="Nome do cliente (opcional)"
              maxLength={CLIENTE_MAX}
              value={nota.cliente}
              onChange={(e) => despachar({ tipo: 'cliente', cliente: e.target.value })}
            />
          </label>

          {qtdItens === 0 ? (
            <p className="nota__vazia">Toque nos produtos para montar a nota.</p>
          ) : (
            <ul className="nota__linhas" ref={refLinhas}>
              {nota.linhas.map((l) => (
                <LinhaNota
                  key={l.produtoId}
                  linha={l}
                  despachar={despachar}
                  foco={foco?.produtoId === l.produtoId ? foco : undefined}
                />
              ))}
            </ul>
          )}
        </fieldset>

        <footer className="nota__rodape">
          {envio.estado === 'erro' && (
            <div className="faixa-erro" role="alert">
              <span className="faixa-erro__texto">{envio.mensagem}</span>
              <button type="button" className="botao botao--secundario" onClick={gerar}>
                Tentar de novo
              </button>
            </div>
          )}
          <div className="nota__total">
            <span>Total</span>
            <strong className="tabular" data-testid="total-nota" aria-live="polite">
              {formatarDinheiro(total)}
            </strong>
          </div>
          <button
            type="button"
            className="botao botao--principal botao--largo"
            disabled={!pronta || salvando}
            onClick={gerar}
          >
            {salvando ? 'Salvando…' : 'Gerar nota'}
          </button>
          {confirmarLimpar ? (
            <div className="nota__confirmar" role="group" aria-label="Confirmar limpeza">
              <span>Limpar a nota?</span>
              <button
                type="button"
                className="botao botao--perigo"
                onClick={() => {
                  despachar({ tipo: 'limpar' });
                  setConfirmarLimpar(false);
                  setEnvio({ estado: 'ocioso' });
                }}
              >
                Sim, limpar
              </button>
              <button type="button" className="botao botao--secundario" onClick={() => setConfirmarLimpar(false)}>
                Não
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="botao botao--secundario botao--largo"
              disabled={(qtdItens === 0 && !nota.cliente) || salvando}
              onClick={() => setConfirmarLimpar(true)}
            >
              Limpar
            </button>
          )}
        </footer>
      </aside>

      <div className="gaveta">
        <div className="gaveta__resumo">
          <span className="gaveta__itens">
            {qtdItens} {qtdItens === 1 ? 'item' : 'itens'}
          </span>
          <strong className="tabular">{formatarDinheiro(total)}</strong>
        </div>
        <button type="button" className="botao botao--principal" onClick={() => setGavetaAberta(true)}>
          Ver nota
        </button>
      </div>

      <Aviso aviso={aviso} />
    </div>
  );
}
