import { useCallback, useEffect, useRef, useState, type PointerEvent as EventoPonteiro } from 'react';

/** Distância da borda da área rolável em que a lista começa a rolar sozinha. */
const BORDA_ROLAGEM = 96;
const VELOCIDADE_MAX = 18;

interface Sessao {
  de: number;
  para: number;
  yInicio: number;
  yAtual: number;
  rolagem: HTMLElement;
  rolagemInicio: number;
  /** Meio vertical de cada linha no começo do arrasto. */
  meios: number[];
  altura: number;
  quadro: number;
}

export interface EstadoArrasto {
  de: number;
  para: number;
  /** Quanto a linha arrastada andou desde o toque (px). */
  dy: number;
  altura: number;
}

function areaRolavel(el: HTMLElement): HTMLElement {
  for (let atual = el.parentElement; atual; atual = atual.parentElement) {
    const { overflowY } = getComputedStyle(atual);
    if ((overflowY === 'auto' || overflowY === 'scroll') && atual.scrollHeight > atual.clientHeight) return atual;
  }
  return (document.scrollingElement as HTMLElement) ?? document.documentElement;
}

/**
 * Arrastar e soltar linhas de uma lista pela alça. Funciona com dedo e
 * mouse (pointer events): só a alça inicia o arrasto, então rolar a lista
 * com o dedo continua normal. Perto da borda de cima ou de baixo, a lista
 * rola sozinha para dar para levar um item do fim ao começo.
 */
export function useArrastarLinhas(quantidade: number, aoSoltar: (de: number, para: number) => void) {
  const [estado, setEstado] = useState<EstadoArrasto | null>(null);
  const linhas = useRef<(HTMLElement | null)[]>([]);
  const sessao = useRef<Sessao | null>(null);
  const soltar = useRef(aoSoltar);
  soltar.current = aoSoltar;

  const registrar = useCallback(
    (indice: number) => (el: HTMLElement | null) => {
      linhas.current[indice] = el;
    },
    [],
  );

  function atualizar(s: Sessao) {
    const dy = s.yAtual - s.yInicio + (s.rolagem.scrollTop - s.rolagemInicio);
    const centro = s.meios[s.de] + dy;
    s.para = s.meios.filter((meio, j) => j !== s.de && meio < centro).length;
    setEstado((antes) =>
      antes && antes.dy === dy && antes.para === s.para ? antes : { de: s.de, para: s.para, dy, altura: s.altura },
    );
  }

  function quadro() {
    const s = sessao.current;
    if (!s) return;
    const caixa =
      s.rolagem === document.scrollingElement
        ? { top: 0, bottom: window.innerHeight }
        : s.rolagem.getBoundingClientRect();
    const perto = s.yAtual < caixa.top + BORDA_ROLAGEM ? s.yAtual - caixa.top - BORDA_ROLAGEM
      : s.yAtual > caixa.bottom - BORDA_ROLAGEM ? s.yAtual - caixa.bottom + BORDA_ROLAGEM
      : 0;
    if (perto !== 0) {
      const forca = Math.min(1, Math.abs(perto) / BORDA_ROLAGEM);
      s.rolagem.scrollTop += Math.sign(perto) * Math.ceil(forca * VELOCIDADE_MAX);
    }
    atualizar(s);
    s.quadro = requestAnimationFrame(quadro);
  }

  function iniciar(indice: number, e: EventoPonteiro<HTMLElement>) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const caixas = linhas.current.slice(0, quantidade).map((el) => el?.getBoundingClientRect());
    if (caixas.some((c) => !c)) return;
    const rolagem = areaRolavel(e.currentTarget);
    sessao.current = {
      de: indice,
      para: indice,
      yInicio: e.clientY,
      yAtual: e.clientY,
      rolagem,
      rolagemInicio: rolagem.scrollTop,
      meios: caixas.map((c) => c!.top + c!.height / 2),
      altura: caixas[indice]!.height,
      quadro: 0,
    };
    setEstado({ de: indice, para: indice, dy: 0, altura: caixas[indice]!.height });
    sessao.current.quadro = requestAnimationFrame(quadro);
  }

  function terminar(confirmar: boolean) {
    const s = sessao.current;
    if (!s) return;
    cancelAnimationFrame(s.quadro);
    sessao.current = null;
    setEstado(null);
    if (confirmar && s.de !== s.para) soltar.current(s.de, s.para);
  }

  useEffect(() => () => cancelAnimationFrame(sessao.current?.quadro ?? 0), []);

  /** Quanto cada linha se desloca durante o arrasto (as do meio abrem espaço). */
  function deslocamento(indice: number): number {
    if (!estado) return 0;
    const { de, para, dy, altura } = estado;
    if (indice === de) return dy;
    if (de < para && indice > de && indice <= para) return -altura;
    if (para < de && indice >= para && indice < de) return altura;
    return 0;
  }

  function propsAlca(indice: number) {
    return {
      onPointerDown: (e: EventoPonteiro<HTMLElement>) => iniciar(indice, e),
      onPointerMove: (e: EventoPonteiro<HTMLElement>) => {
        if (sessao.current) sessao.current.yAtual = e.clientY;
      },
      onPointerUp: () => terminar(true),
      onPointerCancel: () => terminar(false),
    };
  }

  return { estado, registrar, propsAlca, deslocamento };
}
