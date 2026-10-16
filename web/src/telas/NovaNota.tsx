import { useEffect, useState } from 'react';
import { api, type DadosIniciais } from '../api';
import { EmConstrucao } from '../componentes/EmConstrucao';

export function NovaNota() {
  const [dados, setDados] = useState<DadosIniciais | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api.getDadosIniciais().then(setDados, (e: Error) => setErro(e.message));
  }, []);

  const ativos = dados?.produtos.filter((p) => p.ativo).length;

  return (
    <EmConstrucao titulo="Nova nota" fase={2}>
      {erro ? (
        <p className="texto-erro">{erro}</p>
      ) : dados ? (
        <p>
          {ativos} produtos ativos carregados de {dados.config.nome_loja}.
        </p>
      ) : (
        <p>Carregando produtos…</p>
      )}
    </EmConstrucao>
  );
}
