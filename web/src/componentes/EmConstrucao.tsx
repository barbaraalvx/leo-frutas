import type { ReactNode } from 'react';

interface Props {
  titulo: string;
  fase: number;
  children?: ReactNode;
}

/** Tela provisória até a fase indicada (seção 8 da especificação). */
export function EmConstrucao({ titulo, fase, children }: Props) {
  return (
    <>
      <header className="topo">
        <h1 className="topo__titulo">{titulo}</h1>
      </header>
      <div className="tela">
        <div className="cartao">
          {children}
          <p className="texto-fraco">Esta tela chega na fase {fase}.</p>
        </div>
      </div>
    </>
  );
}
