import { CloudOff, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatarDataHora } from '../dominio/formatacao';

interface Props {
  /** Preços guardados em uso porque a planilha não respondeu (ISO de quando foram salvos). */
  usandoGuardadosDe: string | null;
  aoTentarDeNovo: () => void;
}

/** Faixa no topo do conteúdo quando falta internet ou a planilha não respondeu. */
export function FaixaConexao({ usandoGuardadosDe, aoTentarDeNovo }: Props) {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const ligar = () => setOnline(true);
    const desligar = () => setOnline(false);
    window.addEventListener('online', ligar);
    window.addEventListener('offline', desligar);
    return () => {
      window.removeEventListener('online', ligar);
      window.removeEventListener('offline', desligar);
    };
  }, []);

  if (online && !usandoGuardadosDe) return null;

  return (
    <div className="faixa-conexao" role="status">
      <CloudOff size={18} aria-hidden />
      <span className="faixa-conexao__texto">
        {!online
          ? 'Sem internet. Dá para montar a nota; ela é salva quando a conexão voltar.'
          : `Planilha sem resposta. Usando os preços guardados em ${formatarDataHora(usandoGuardadosDe!)}.`}
      </span>
      {online && (
        <button type="button" className="botao botao--secundario faixa-conexao__botao" onClick={aoTentarDeNovo}>
          <RefreshCw size={16} aria-hidden /> Tentar de novo
        </button>
      )}
    </div>
  );
}
