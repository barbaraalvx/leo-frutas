// Imitação mínima do SpreadsheetApp, LockService, ScriptApp e HtmlService
// para rodar o código do servidor fora do Google: nos testes (Vitest) e no
// servidor local de produção (scripts/servidor-local.ts). Só implementa o
// que o código usa; getLastRow e afins seguem o comportamento do Google.

type Valor = string | number | boolean | Date;

export class AbaFalsa {
  linhas: Valor[][] = [];
  formatos = new Map<number, string>();
  linhasCongeladas = 0;

  constructor(public nome: string) {}

  getName() {
    return this.nome;
  }

  getLastRow() {
    for (let i = this.linhas.length - 1; i >= 0; i--) {
      if (this.linhas[i].some((v) => v !== '')) return i + 1;
    }
    return 0;
  }

  getLastColumn() {
    return this.linhas.reduce((m, l) => {
      let ultima = 0;
      l.forEach((v, j) => {
        if (v !== '') ultima = j + 1;
      });
      return Math.max(m, ultima);
    }, 0);
  }

  getMaxRows() {
    return 1000;
  }

  getRange(linha: number, coluna: number, nLinhas = 1, nColunas = 1) {
    if (linha < 1 || coluna < 1 || nLinhas < 1 || nColunas < 1) {
      throw new Error(`Intervalo inválido: ${linha},${coluna},${nLinhas},${nColunas}`);
    }
    return new IntervaloFalso(this, linha, coluna, nLinhas, nColunas);
  }

  setFrozenRows(n: number) {
    this.linhasCongeladas = n;
  }

  celula(linha: number, coluna: number): Valor {
    return this.linhas[linha - 1]?.[coluna - 1] ?? '';
  }

  definir(linha: number, coluna: number, valor: Valor) {
    while (this.linhas.length < linha) this.linhas.push([]);
    const l = this.linhas[linha - 1];
    while (l.length < coluna) l.push('');
    // Como no Google: apóstrofo inicial força texto e não fica no valor.
    l[coluna - 1] = typeof valor === 'string' && valor.startsWith("'") ? valor.slice(1) : valor;
  }

  /** Dados como objetos, para conferir nos testes. */
  objetos(): Record<string, Valor>[] {
    const [cab = [], ...resto] = this.linhas;
    return resto
      .filter((l) => l.some((v) => v !== ''))
      .map((l) => Object.fromEntries(cab.map((c, j) => [String(c), l[j] ?? ''])));
  }
}

class IntervaloFalso {
  constructor(
    private aba: AbaFalsa,
    private linha: number,
    private coluna: number,
    private nLinhas: number,
    private nColunas: number,
  ) {}

  getValues(): Valor[][] {
    return Array.from({ length: this.nLinhas }, (_, i) =>
      Array.from({ length: this.nColunas }, (_, j) => this.aba.celula(this.linha + i, this.coluna + j)),
    );
  }

  setValues(valores: Valor[][]) {
    if (valores.length !== this.nLinhas || valores.some((l) => l.length !== this.nColunas)) {
      throw new Error('As dimensões dos dados não correspondem às do intervalo.');
    }
    valores.forEach((l, i) => l.forEach((v, j) => this.aba.definir(this.linha + i, this.coluna + j, v)));
    return this;
  }

  setValue(valor: Valor) {
    this.aba.definir(this.linha, this.coluna, valor);
    return this;
  }

  setNumberFormat(formato: string) {
    for (let j = 0; j < this.nColunas; j++) this.aba.formatos.set(this.coluna + j, formato);
    return this;
  }

  setFontWeight() {
    return this;
  }
}

export class PlanilhaFalsa {
  abas: AbaFalsa[] = [new AbaFalsa('Página1')];
  fuso = '';
  localidade = '';

  getSheetByName(nome: string) {
    return this.abas.find((a) => a.nome === nome) ?? null;
  }

  insertSheet(nome: string) {
    if (this.getSheetByName(nome)) throw new Error(`Já existe uma aba chamada "${nome}".`);
    const aba = new AbaFalsa(nome);
    this.abas.push(aba);
    return aba;
  }

  getSheets() {
    return [...this.abas];
  }

  deleteSheet(aba: AbaFalsa) {
    this.abas = this.abas.filter((a) => a !== aba);
  }

  setSpreadsheetTimeZone(fuso: string) {
    this.fuso = fuso;
  }

  setSpreadsheetLocale(localidade: string) {
    this.localidade = localidade;
  }

  aba(nome: string): AbaFalsa {
    const a = this.getSheetByName(nome);
    if (!a) throw new Error(`Sem aba ${nome}`);
    return a;
  }
}

export const URL_APP = 'https://script.google.com/macros/s/ID/exec';
export const HTML_APP = '<!doctype html><html><head><title>Léo Frutas</title></head><body><div id="root"></div></body></html>';

class SaidaHtmlFalsa {
  titulo = '';
  metas: Record<string, string> = {};
  constructor(private conteudo: string) {}
  getContent() {
    return this.conteudo;
  }
  setTitle(t: string) {
    this.titulo = t;
    return this;
  }
  addMetaTag(nome: string, valor: string) {
    this.metas[nome] = valor;
    return this;
  }
  icone = '';
  setFaviconUrl(url: string) {
    // Como o Google: endereço que não é imagem pública é recusado.
    if (!url.endsWith('.png') && !url.includes('googleusercontent.com')) {
      throw new Error('Unexpected error while getting the method or property setFaviconUrl.');
    }
    this.icone = url;
    return this;
  }
}

export interface OpcoesGoogleFalso {
  travaOcupada?: boolean;
  /** Conta de quem acessa sem permissão na planilha. */
  semAcesso?: boolean;
  email?: string;
  urlApp?: string;
  /** Conteúdo de index.html (o build do app); padrão: um HTML mínimo. */
  html?: string;
  /** Embrulha funções para espiar chamadas (vi.fn nos testes). */
  espiao?: <F extends (...a: never[]) => unknown>(fn: F) => F;
}

/** Os globais do Apps Script (SpreadsheetApp etc.) e a planilha falsa por trás. */
export function criarGoogleFalso(opcoes: OpcoesGoogleFalso = {}) {
  const espiao = opcoes.espiao ?? ((fn) => fn);
  const ss = new PlanilhaFalsa();
  const trava = {
    tryLock: espiao((_ms: number) => !opcoes.travaOcupada),
    releaseLock: espiao(() => {}),
  };
  const cache = new Map<string, string>();
  const globais = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => {
        // Mensagem real do Google para quem não tem acesso ao documento.
        if (opcoes.semAcesso) throw new Error('You do not have permission to access the requested document.');
        return ss;
      },
      flush: espiao(() => {}),
    },
    Session: { getActiveUser: () => ({ getEmail: () => opcoes.email ?? 'leo@gmail.com' }) },
    LockService: { getScriptLock: () => trava },
    CacheService: {
      getScriptCache: () => ({
        get: (chave: string) => cache.get(chave) ?? null,
        put: (chave: string, valor: string) => void cache.set(chave, valor),
      }),
    },
    ScriptApp: { getService: () => ({ getUrl: () => opcoes.urlApp ?? URL_APP }) },
    HtmlService: {
      createHtmlOutputFromFile: () => new SaidaHtmlFalsa(opcoes.html ?? HTML_APP),
      createHtmlOutput: (html: string) => new SaidaHtmlFalsa(html),
    },
  };
  return { ss, trava, globais };
}
