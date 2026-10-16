import { useLayoutEffect, useRef, useState } from 'react';
import { formatarDiaCurto, formatarDinheiro, formatarDinheiroCompacto } from '../dominio/formatacao';
import { marcasDoEixo } from '../dominio/painel';

interface Props {
  porDia: { dia: string; total: number }[];
  /** Primeiro dia do período escolhido; os anteriores aparecem em cinza, só de contexto. */
  inicioPeriodo: string;
}

const ALTURA = 220;
const MARGEM = { topo: 24, direita: 8, base: 28, esquerda: 64 };
const BARRA_MAX = 24;
/** Largura mínima da faixa do dia para o valor caber sobre a barra sem invadir as vizinhas. */
const FAIXA_PARA_ROTULO = 56;
const RAIO = 4;
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function diaDaSemana(dia: string): string {
  return DIAS_SEMANA[new Date(`${dia}T12:00:00Z`).getUTCDay()];
}

/** Coluna com o topo arredondado (4 px) e a base reta, crescendo do zero. */
function caminhoBarra(x: number, y: number, largura: number, altura: number): string {
  const r = Math.min(RAIO, altura, largura / 2);
  const base = y + altura;
  return [
    `M${x},${base}`,
    `V${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `H${x + largura - r}`,
    `Q${x + largura},${y} ${x + largura},${y + r}`,
    `V${base}`,
    'Z',
  ].join(' ');
}

/** Vendas por dia (6.6): colunas, eixo em reais, dica ao tocar e tabela. */
export function GraficoVendas({ porDia, inicioPeriodo }: Props) {
  const area = useRef<HTMLDivElement>(null);
  const [largura, setLargura] = useState(0);
  const [ativo, setAtivo] = useState<number | null>(null);

  useLayoutEffect(() => {
    const medir = () => setLargura(area.current?.clientWidth ?? 0);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(area.current!);
    return () => observador.disconnect();
  }, []);

  const semVendas = porDia.every((d) => d.total === 0);
  const marcas = marcasDoEixo(Math.max(...porDia.map((d) => d.total)));
  const topo = marcas[marcas.length - 1];
  const larguraPlot = Math.max(largura - MARGEM.esquerda - MARGEM.direita, 0);
  const alturaPlot = ALTURA - MARGEM.topo - MARGEM.base;
  const faixa = porDia.length ? larguraPlot / porDia.length : 0;
  const larguraBarra = Math.min(BARRA_MAX, faixa * 0.6);
  const y = (centavos: number) => MARGEM.topo + alturaPlot - (centavos / topo) * alturaPlot;
  // Rótulos de dia com pelo menos ~44 px entre si; o último (hoje) sempre aparece.
  const cadaQuantos = Math.max(1, Math.ceil(44 / Math.max(faixa, 1)));
  const ultimo = porDia.length - 1;

  return (
    <div className="grafico">
      <div className="grafico__area" ref={area}>
        {largura > 0 && (
          <svg
            width={largura}
            height={ALTURA}
            role="img"
            aria-label={`Vendas por dia, de ${formatarDiaCurto(porDia[0]?.dia ?? '')} a ${formatarDiaCurto(porDia[ultimo]?.dia ?? '')}`}
          >
            {marcas.map((m) => (
              <g key={m}>
                <line
                  className="grafico__grade"
                  x1={MARGEM.esquerda}
                  x2={largura - MARGEM.direita}
                  y1={y(m)}
                  y2={y(m)}
                />
                <text className="grafico__eixo" x={MARGEM.esquerda - 8} y={y(m)} dy="0.32em" textAnchor="end">
                  {formatarDinheiroCompacto(m)}
                </text>
              </g>
            ))}

            {porDia.map((d, i) => {
              const centro = MARGEM.esquerda + faixa * i + faixa / 2;
              const altura = (d.total / topo) * alturaPlot;
              const doPeriodo = d.dia >= inicioPeriodo;
              const mostrarDia = (ultimo - i) % cadaQuantos === 0;
              return (
                <g key={d.dia}>
                  {altura > 0 && (
                    <path
                      className={`grafico__barra${doPeriodo ? '' : ' grafico__barra--contexto'}${ativo === i ? ' grafico__barra--ativa' : ''}`}
                      d={caminhoBarra(centro - larguraBarra / 2, y(d.total), larguraBarra, altura)}
                    />
                  )}
                  {mostrarDia && (
                    <text className="grafico__eixo" x={centro} y={ALTURA - 8} textAnchor="middle">
                      {i === ultimo ? 'hoje' : formatarDiaCurto(d.dia)}
                    </text>
                  )}
                  {/* Valor só no último dia, e só se couber; senão fica na dica e na tabela. */}
                  {i === ultimo && d.total > 0 && faixa >= FAIXA_PARA_ROTULO && (
                    <text className="grafico__valor" x={centro} y={y(d.total) - 6} textAnchor="middle">
                      {formatarDinheiro(d.total)}
                    </text>
                  )}
                  {/* Área de toque: a faixa inteira do dia, maior que a barra. */}
                  <rect
                    className="grafico__alvo"
                    x={centro - faixa / 2}
                    y={MARGEM.topo}
                    width={faixa}
                    height={alturaPlot}
                    tabIndex={0}
                    aria-label={`${diaDaSemana(d.dia)}, ${formatarDiaCurto(d.dia)}: ${formatarDinheiro(d.total)}`}
                    onPointerEnter={() => setAtivo(i)}
                    onPointerLeave={() => setAtivo((a) => (a === i ? null : a))}
                    onFocus={() => setAtivo(i)}
                    onBlur={() => setAtivo((a) => (a === i ? null : a))}
                  />
                </g>
              );
            })}

            <line
              className="grafico__base"
              x1={MARGEM.esquerda}
              x2={largura - MARGEM.direita}
              y1={y(0)}
              y2={y(0)}
            />
          </svg>
        )}

        {ativo !== null && porDia[ativo] && (
          <div
            className="grafico__dica"
            role="status"
            style={{
              left: Math.min(
                Math.max(MARGEM.esquerda + faixa * ativo + faixa / 2, 70),
                Math.max(largura - 70, 70),
              ),
              top: Math.max(y(porDia[ativo].total) - 8, 0),
            }}
          >
            <strong className="tabular">{formatarDinheiro(porDia[ativo].total)}</strong>
            <span>
              {diaDaSemana(porDia[ativo].dia)}, {formatarDiaCurto(porDia[ativo].dia)}
            </span>
          </div>
        )}

        {semVendas && <p className="grafico__vazio">Nenhuma venda nestes dias.</p>}
      </div>

      <div className="grafico__legenda">
        <span>
          <span className="grafico__amostra" aria-hidden /> Período escolhido
        </span>
        {porDia.some((d) => d.dia < inicioPeriodo) && (
          <span>
            <span className="grafico__amostra grafico__amostra--contexto" aria-hidden /> Dias anteriores, para comparar
          </span>
        )}
      </div>

      <details className="grafico__tabela">
        <summary>Ver em tabela</summary>
        <table>
          <thead>
            <tr>
              <th>Dia</th>
              <th className="tabela__num">Vendas</th>
            </tr>
          </thead>
          <tbody>
            {[...porDia].reverse().map((d) => (
              <tr key={d.dia}>
                <td>
                  {diaDaSemana(d.dia)}, {formatarDiaCurto(d.dia)}
                </td>
                <td className="tabela__num tabular">{formatarDinheiro(d.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
