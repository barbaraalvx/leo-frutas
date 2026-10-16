import { useEffect, useState } from 'react';
import { api } from '../api';
import { NotaImpressa } from '../componentes/NotaImpressa';
import type { Config, Nota } from '../dominio/tipos';

/**
 * Página só com a nota (?view=nota&numero=N), aberta numa aba própria para
 * imprimir fora do iframe do Apps Script. Chama a impressão ao carregar.
 */
export function PaginaImpressao({ numero }: { numero: number }) {
  const [dados, setDados] = useState<{ nota: Nota; config: Config } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(numero) || numero <= 0) {
      setErro('Número de nota inválido.');
      return;
    }
    Promise.all([api.getNota(numero), api.getDadosIniciais()]).then(
      ([nota, { config }]) => setDados({ nota, config }),
      (e: Error) => setErro(e.message),
    );
  }, [numero]);

  useEffect(() => {
    if (!dados) return;
    document.title = `Nota ${String(numero).padStart(4, '0')} · Léo Frutas`;
    // Nos testes automatizados (Playwright) o diálogo de impressão travaria.
    if (navigator.webdriver) return;
    // Espera a logo e as fontes antes de abrir o diálogo.
    const imagens = [...document.images].map((img) => img.decode().catch(() => undefined));
    Promise.all([document.fonts.ready, ...imagens]).then(() => window.print());
  }, [dados, numero]);

  if (erro) return <p className="pagina-impressao__aviso texto-erro">{erro}</p>;
  if (!dados) return <p className="pagina-impressao__aviso">Carregando nota…</p>;
  return (
    <div className="pagina-impressao">
      <NotaImpressa nota={dados.nota} config={dados.config} />
    </div>
  );
}
