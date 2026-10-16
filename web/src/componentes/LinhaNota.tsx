import { Minus, Plus, X } from 'lucide-react';
import { useEffect, useRef, useState, type Dispatch } from 'react';
import { MIL } from '../dominio/calculo';
import {
  formatarCentavosCampo,
  formatarDinheiro,
  formatarPeso,
  lerDinheiro,
  lerPeso,
  rotuloUnidade,
} from '../dominio/formatacao';
import { estaAjustada, valorCalculado, valorFinal, type AcaoNota, type LinhaNota as Linha } from '../dominio/nota';
import { CampoNumerico } from './CampoNumerico';

export interface PedidoDeFoco {
  campo: 'quantidade' | 'preco';
  /** Muda a cada pedido, para focar de novo no mesmo campo. */
  vez: number;
}

interface Props {
  linha: Linha;
  despachar: Dispatch<AcaoNota>;
  foco?: PedidoDeFoco;
}

export function LinhaNota({ linha, despachar, foco }: Props) {
  const { produtoId: id, nome, tipo } = linha;
  const refQuantidade = useRef<HTMLInputElement>(null);
  const refPreco = useRef<HTMLInputElement>(null);
  const [editandoPreco, setEditandoPreco] = useState(false);

  const calculado = valorCalculado(linha);
  const final = valorFinal(linha);
  const ajustada = estaAjustada(linha);
  const semPreco = linha.preco === null;
  const unidade = rotuloUnidade(tipo);

  useEffect(() => {
    if (!foco) return;
    if (foco.campo === 'preco') setEditandoPreco(true);
    // Espera o campo de preço aparecer antes de focar.
    requestAnimationFrame(() => (foco.campo === 'preco' ? refPreco : refQuantidade).current?.focus());
  }, [foco]);

  const mostrarCampoPreco = semPreco || editandoPreco;

  return (
    <li className={`linha-nota${ajustada ? ' linha-nota--ajustada' : ''}`}>
      <div className="linha-nota__topo">
        <span className="linha-nota__nome">{nome}</span>
        <label className="linha-nota__valor">
          <span className="linha-nota__rs" aria-hidden>
            R$
          </span>
          <CampoNumerico
            aria-label={`Valor de ${nome}`}
            inputMode="decimal"
            placeholder="—"
            disabled={final === null}
            exibido={final === null ? '' : formatarCentavosCampo(final)}
            aoConfirmar={(t) => {
              const valor = lerDinheiro(t);
              if (t.trim() === '') despachar({ tipo: 'voltarAoCalculado', produtoId: id });
              else if (valor !== null) despachar({ tipo: 'valorFinal', produtoId: id, valor });
            }}
          />
        </label>
        <button
          type="button"
          className="botao botao--icone linha-nota__remover"
          aria-label={`Remover ${nome}`}
          onClick={() => despachar({ tipo: 'remover', produtoId: id })}
        >
          <X size={18} aria-hidden />
        </button>
      </div>

      <div className="linha-nota__meio">
        {tipo === 'kg' ? (
          <label className="linha-nota__peso">
            <CampoNumerico
              ref={refQuantidade}
              aria-label={`Peso de ${nome} em kg`}
              inputMode="decimal"
              placeholder="0,000"
              exibido={linha.quantidade ? formatarPeso(linha.quantidade) : ''}
              aoDigitar={(t) => {
                const q = t.trim() === '' ? 0 : lerPeso(t);
                if (q !== null) despachar({ tipo: 'quantidade', produtoId: id, quantidade: q });
              }}
            />
            <span className="linha-nota__unidade">kg</span>
          </label>
        ) : (
          <div className="contador">
            <button
              type="button"
              className="contador__botao"
              aria-label={`Menos 1 ${nome}`}
              onClick={() => despachar({ tipo: 'somar', produtoId: id, delta: -1 })}
            >
              <Minus size={16} aria-hidden />
            </button>
            <CampoNumerico
              ref={refQuantidade}
              className="contador__campo"
              aria-label={`Quantidade de ${nome}`}
              inputMode="numeric"
              exibido={String(linha.quantidade / MIL)}
              aoDigitar={(t) => {
                if (/^\d{1,4}$/.test(t.trim())) {
                  despachar({ tipo: 'quantidade', produtoId: id, quantidade: Number(t) * MIL });
                }
              }}
            />
            <button
              type="button"
              className="contador__botao"
              aria-label={`Mais 1 ${nome}`}
              onClick={() => despachar({ tipo: 'somar', produtoId: id, delta: 1 })}
            >
              <Plus size={16} aria-hidden />
            </button>
            <span className="linha-nota__unidade">{unidade}</span>
          </div>
        )}

        <span className="linha-nota__vezes" aria-hidden>
          ×
        </span>

        {mostrarCampoPreco ? (
          <CampoNumerico
            ref={refPreco}
            className={`linha-nota__campo-preco${semPreco ? ' campo--pendente' : ''}`}
            aria-label={`Preço unitário de ${nome}`}
            inputMode="decimal"
            placeholder="preço"
            exibido={linha.preco === null ? '' : formatarCentavosCampo(linha.preco)}
            aoConfirmar={(t) => {
              const preco = lerDinheiro(t);
              if (preco !== null || t.trim() === '') {
                despachar({ tipo: 'preco', produtoId: id, preco: preco ?? linha.preco });
              }
              setEditandoPreco(false);
            }}
          />
        ) : (
          <button
            type="button"
            className="linha-nota__preco tabular"
            aria-label={`Preço unitário de ${nome}: ${formatarDinheiro(linha.preco!)}. Tocar para mudar só nesta nota`}
            onClick={() => {
              setEditandoPreco(true);
              requestAnimationFrame(() => refPreco.current?.focus());
            }}
          >
            {formatarDinheiro(linha.preco!)}
          </button>
        )}

      </div>

      {ajustada && (
        <div className="linha-nota__ajuste">
          <span className="selo selo--ajustado">ajustado</span>
          <button
            type="button"
            className="botao botao--link"
            onClick={() => despachar({ tipo: 'voltarAoCalculado', produtoId: id })}
          >
            voltar ao calculado
          </button>
          {calculado !== null && (
            <span className="linha-nota__calculado tabular">calculado {formatarDinheiro(calculado)}</span>
          )}
        </div>
      )}
    </li>
  );
}
