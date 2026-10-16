import { ArrowLeft, Printer, Receipt } from 'lucide-react';
import { useLayoutEffect, useRef, useState } from 'react';
import { urlImpressao } from '../api';
import { NotaImpressa } from '../componentes/NotaImpressa';
import { formatarNumeroNota } from '../dominio/formatacao';
import type { Config, Nota } from '../dominio/tipos';

interface Props {
  nota: Nota;
  config: Config;
  aoVoltar: () => void;
  aoNovaNota: () => void;
}

/** Pré-visualização (6.2): a folha em escala, com Imprimir, Nova nota e Voltar. */
export function PreVisualizacao({ nota, config, aoVoltar, aoNovaNota }: Props) {
  return (
    <div className="previa">
      <header className="topo previa__topo">
        <button type="button" className="botao botao--secundario" onClick={aoVoltar}>
          <ArrowLeft size={18} aria-hidden /> Voltar
        </button>
        <h1 className="topo__titulo">Nota {formatarNumeroNota(nota.numero)}</h1>
        <div className="previa__acoes">
          <button
            type="button"
            className="botao botao--confirmar"
            onClick={() => window.open(urlImpressao(nota.numero), '_blank', 'noopener')}
          >
            <Printer size={18} aria-hidden /> Imprimir
          </button>
          <button type="button" className="botao botao--principal" onClick={aoNovaNota}>
            <Receipt size={18} aria-hidden /> Nova nota
          </button>
        </div>
      </header>
      <FolhaEmEscala>
        <NotaImpressa nota={nota} config={config} />
      </FolhaEmEscala>
    </div>
  );
}

/** Encolhe a folha A4 para caber na largura disponível, sem aumentar. */
function FolhaEmEscala({ children }: { children: React.ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const folha = useRef<HTMLDivElement>(null);
  const [medidas, setMedidas] = useState({ escala: 1, altura: 0 });

  useLayoutEffect(() => {
    const medir = () => {
      if (!area.current || !folha.current) return;
      const larguraFolha = folha.current.offsetWidth;
      const escala = Math.min(1, area.current.clientWidth / larguraFolha);
      setMedidas({ escala, altura: folha.current.offsetHeight * escala });
    };
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(area.current!);
    return () => observador.disconnect();
  }, []);

  return (
    <div className="previa__area" ref={area}>
      <div className="previa__moldura" style={{ height: medidas.altura || undefined }}>
        <div ref={folha} className="previa__folha" style={{ transform: `scale(${medidas.escala})` }}>
          {children}
        </div>
      </div>
    </div>
  );
}
