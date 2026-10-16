import { useEffect, useId, useRef, type ReactNode } from 'react';

interface Props {
  titulo: string;
  aoFechar: () => void;
  children: ReactNode;
  /** Botões do rodapé. */
  acoes: ReactNode;
}

/**
 * Janela por cima da tela, no lugar de window.confirm (que trava o
 * navegador e não segue o visual). Esc ou tocar fora fecham.
 */
export function Dialogo({ titulo, aoFechar, children, acoes }: Props) {
  const idTitulo = useId();
  const caixa = useRef<HTMLDivElement>(null);
  // aoFechar muda a cada render do pai; o efeito abaixo roda só ao abrir.
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const primeiro = caixa.current?.querySelector<HTMLElement>('input, textarea, select, button');
    primeiro?.focus();
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && fechar.current();
    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      anterior?.focus?.();
    };
  }, []);

  return (
    <div className="dialogo__fundo" onMouseDown={(e) => e.target === e.currentTarget && aoFechar()}>
      <div ref={caixa} className="dialogo" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <h2 id={idTitulo} className="dialogo__titulo">
          {titulo}
        </h2>
        <div className="dialogo__corpo">{children}</div>
        <div className="dialogo__acoes">{acoes}</div>
      </div>
    </div>
  );
}
