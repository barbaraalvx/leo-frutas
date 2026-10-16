import { Ban, ChevronRight, Search, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Aviso, useAviso } from '../componentes/Aviso';
import { Dialogo } from '../componentes/Dialogo';
import { formatarDataHora, formatarDinheiro, formatarNumeroNota } from '../dominio/formatacao';
import { desdeDoFiltro, FILTROS_PERIODO, type FiltroPeriodo } from '../dominio/notas';
import type { Config, Nota, ResumoNota } from '../dominio/tipos';
import '../estilos/notas.css';
import { PreVisualizacao } from './PreVisualizacao';

const POR_PAGINA = 50;
const MOTIVO_MAX = 200;

interface Props {
  config: Config | null;
}

export function Notas({ config }: Props) {
  const [filtro, setFiltro] = useState<FiltroPeriodo>('hoje');
  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [notas, setNotas] = useState<ResumoNota[]>([]);
  const [temMais, setTemMais] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState<number | null>(null);
  const [aberta, setAberta] = useState<Nota | null>(null);
  const [cancelando, setCancelando] = useState(false);
  const { aviso, mostrar } = useAviso();
  // Respostas que chegam fora de ordem (filtro trocado no meio) são ignoradas.
  const pedido = useRef(0);

  // Espera parar de digitar antes de buscar no servidor.
  useEffect(() => {
    const t = window.setTimeout(() => setBuscaAplicada(busca.trim()), 300);
    return () => window.clearTimeout(t);
  }, [busca]);

  const carregar = useCallback(
    async (offset: number) => {
      const meu = ++pedido.current;
      setCarregando(true);
      setErro(null);
      try {
        const r = await api.listarNotas({
          desde: desdeDoFiltro(filtro),
          busca: buscaAplicada || undefined,
          offset,
          limite: POR_PAGINA,
        });
        if (meu !== pedido.current) return;
        setNotas((atuais) => (offset === 0 ? r.notas : [...atuais, ...r.notas]));
        setTemMais(r.temMais);
      } catch (e) {
        if (meu === pedido.current) setErro(e instanceof Error ? e.message : String(e));
      } finally {
        if (meu === pedido.current) setCarregando(false);
      }
    },
    [filtro, buscaAplicada],
  );

  useEffect(() => {
    carregar(0);
  }, [carregar]);

  async function abrir(numero: number) {
    setAbrindo(numero);
    setErro(null);
    try {
      setAberta(await api.getNota(numero));
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setAbrindo(null);
    }
  }

  async function cancelar(nota: Nota, motivo: string) {
    await api.cancelarNota(nota.numero, motivo);
    const observacao = motivo.trim();
    setAberta({ ...nota, status: 'cancelada', observacao });
    setNotas((lista) =>
      lista.map((n) => (n.numero === nota.numero ? { ...n, status: 'cancelada', observacao } : n)),
    );
    setCancelando(false);
    mostrar(`Nota ${formatarNumeroNota(nota.numero)} cancelada`);
  }

  if (aberta && config) {
    return (
      <>
        <PreVisualizacao
          nota={aberta}
          config={config}
          aoVoltar={() => setAberta(null)}
          rotuloImprimir="Reimprimir"
          acoes={
            aberta.status === 'emitida' && (
              <button type="button" className="botao botao--secundario botao--texto-erro" onClick={() => setCancelando(true)}>
                <Ban size={18} aria-hidden /> Cancelar nota
              </button>
            )
          }
        />
        {cancelando && (
          <DialogoCancelar nota={aberta} aoFechar={() => setCancelando(false)} aoConfirmar={(m) => cancelar(aberta, m)} />
        )}
        <Aviso aviso={aviso} />
      </>
    );
  }

  return (
    <div className="notas">
      <header className="topo">
        <h1 className="topo__titulo">Notas</h1>
      </header>

      <div className="tela notas__corpo">
        <div className="notas__filtros">
          <div className="abas abas--sem-recuo" role="tablist" aria-label="Período">
            {FILTROS_PERIODO.map((f) => (
              <button
                key={f.id}
                type="button"
                role="tab"
                className="aba"
                aria-selected={f.id === filtro}
                onClick={() => setFiltro(f.id)}
              >
                {f.rotulo}
              </button>
            ))}
          </div>
          <label className="busca notas__busca">
            <span className="sr-only">Buscar por cliente ou número</span>
            <input
              type="search"
              className="busca__campo"
              placeholder="Cliente ou número…"
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

        {erro && (
          <div className="faixa-erro" role="alert">
            <span className="faixa-erro__texto">{erro}</span>
            <button type="button" className="botao botao--secundario" onClick={() => carregar(0)}>
              Tentar de novo
            </button>
          </div>
        )}

        <div className="cartao notas__cartao">
          {notas.length === 0 ? (
            <p className="texto-fraco notas__vazio">
              {carregando
                ? 'Carregando notas…'
                : buscaAplicada
                  ? `Nenhuma nota encontrada para “${buscaAplicada}”.`
                  : 'Nenhuma nota neste período.'}
            </p>
          ) : (
            <ul className="lista-notas">
              {notas.map((n) => (
                <li key={n.numero}>
                  <button
                    type="button"
                    className={`lista-notas__item${n.status === 'cancelada' ? ' lista-notas__item--cancelada' : ''}`}
                    onClick={() => abrir(n.numero)}
                    disabled={abrindo !== null}
                    aria-label={`Abrir nota ${formatarNumeroNota(n.numero)}${n.status === 'cancelada' ? ', cancelada' : ''}`}
                  >
                    <span className="lista-notas__numero tabular">{formatarNumeroNota(n.numero)}</span>
                    <span className="lista-notas__info">
                      <span className="lista-notas__cliente">{n.cliente || 'Sem nome'}</span>
                      <span className="lista-notas__data tabular">
                        {formatarDataHora(n.data_hora)} · {n.qtd_itens} {n.qtd_itens === 1 ? 'item' : 'itens'}
                      </span>
                    </span>
                    {n.status === 'cancelada' && <span className="selo selo--cancelada">cancelada</span>}
                    <span className="lista-notas__total tabular">{formatarDinheiro(n.total)}</span>
                    <span className="lista-notas__seta" aria-hidden>
                      {abrindo === n.numero ? '…' : <ChevronRight size={18} />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {temMais && (
            <div className="notas__mais">
              <button
                type="button"
                className="botao botao--secundario"
                disabled={carregando}
                onClick={() => carregar(notas.length)}
              >
                {carregando ? 'Carregando…' : 'Carregar mais'}
              </button>
            </div>
          )}
        </div>
      </div>
      <Aviso aviso={aviso} />
    </div>
  );
}

interface PropsCancelar {
  nota: Nota;
  aoFechar: () => void;
  aoConfirmar: (motivo: string) => Promise<void>;
}

function DialogoCancelar({ nota, aoFechar, aoConfirmar }: PropsCancelar) {
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function confirmar() {
    setEnviando(true);
    setErro(null);
    try {
      await aoConfirmar(motivo);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
      setEnviando(false);
    }
  }

  return (
    <Dialogo
      titulo={`Cancelar a nota ${formatarNumeroNota(nota.numero)}?`}
      aoFechar={() => !enviando && aoFechar()}
      acoes={
        <>
          <button type="button" className="botao botao--secundario" onClick={aoFechar} disabled={enviando}>
            Voltar
          </button>
          <button type="button" className="botao botao--perigo" onClick={confirmar} disabled={enviando}>
            {enviando ? 'Cancelando…' : 'Cancelar nota'}
          </button>
        </>
      }
    >
      <p>
        A nota continua na planilha, marcada como cancelada, e sai do painel. Não dá para desfazer; para corrigir, faça
        uma nota nova.
      </p>
      <label>
        <span className="rotulo">Motivo (opcional)</span>
        <textarea
          className="campo campo--texto-longo"
          maxLength={MOTIVO_MAX}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Ex.: cliente desistiu"
        />
      </label>
      {erro && (
        <p className="texto-erro" role="alert">
          {erro}
        </p>
      )}
    </Dialogo>
  );
}
