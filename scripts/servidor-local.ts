// "Apps Script" local para testar o build de produção sem conta Google:
// roda o apps-script/build/Code.js de verdade (doGet + API) contra a
// planilha falsa em memória e imita o google.script.run no navegador.
// Uso: npm run build && npx vite-node scripts/servidor-local.ts
// Usado pelo projeto "producao" do Playwright.

import { readFileSync } from 'node:fs';
import http from 'node:http';
import vm from 'node:vm';
import { criarGoogleFalso } from '../apps-script/testes/falsos';

const PORTA = Number(process.env.PORTA ?? 5175);
/** Atraso artificial por chamada, como o Apps Script (1–2 s na vida real). */
const LATENCIA_MS = Number(process.env.LATENCIA_MS ?? 300);

const build = new URL('../apps-script/build/', import.meta.url);
const html = readFileSync(new URL('index.html', build), 'utf8');
const codigo = readFileSync(new URL('Code.js', build), 'utf8');

const { ss, globais } = criarGoogleFalso({ html, urlApp: `http://localhost:${PORTA}/` });
const contexto = vm.createContext({ ...globais, console });
vm.runInContext(codigo, contexto, { filename: 'Code.js' });
// Como a Bárbara fará pelo menu da planilha na primeira vez.
console.log(contexto.setup());

const API = new Set(['getDadosIniciais', 'salvarNota', 'listarNotas', 'getNota', 'cancelarNota', 'salvarProdutos', 'getPainel']);

// google.script.run de mentira: cada chamada vira POST /rpc/<função>.
const googleFalso = `<script>
(function () {
  function criar(ok, falha) {
    return new Proxy({}, {
      get: function (_, nome) {
        if (nome === 'withSuccessHandler') return function (f) { return criar(f, falha); };
        if (nome === 'withFailureHandler') return function (f) { return criar(ok, f); };
        return function () {
          fetch('/rpc/' + nome, { method: 'POST', body: JSON.stringify([].slice.call(arguments)) })
            .then(function (r) { return r.json(); })
            .then(function (r) {
              if ('erro' in r) { if (falha) falha(new Error(r.erro)); }
              else if (ok) ok(r.resultado);
            });
        };
      }
    });
  }
  window.google = { script: { run: criar() } };
})();
</script>`;

/** O Apps Script não devolve Date nem funções ao navegador: falha aqui também. */
function conferirSerializavel(valor: unknown, caminho = 'resultado'): void {
  const tipo = Object.prototype.toString.call(valor);
  if (tipo === '[object Date]') throw new Error(`${caminho} é Date; devolva texto ISO.`);
  if (typeof valor === 'function') throw new Error(`${caminho} é função.`);
  if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) conferirSerializavel(v, `${caminho}.${k}`);
  }
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://localhost:${PORTA}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const saida = contexto.doGet({ parameter: Object.fromEntries(url.searchParams) });
      const pagina = saida.getContent().replace('<head>', () => `<head>${googleFalso}`);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(pagina);
      return;
    }

    // Só para os testes conferirem o que foi gravado.
    if (req.method === 'GET' && url.pathname === '/__planilha') {
      const abas = Object.fromEntries(ss.getSheets().map((a) => [a.getName(), a.objetos()]));
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(abas));
      return;
    }

    const rpc = /^\/rpc\/(\w+)$/.exec(url.pathname);
    if (req.method === 'POST' && rpc && API.has(rpc[1])) {
      let corpo = '';
      for await (const pedaco of req) corpo += pedaco;
      await esperar(LATENCIA_MS);
      let resposta: object;
      try {
        const resultado = contexto[rpc[1]](...JSON.parse(corpo));
        conferirSerializavel(resultado);
        resposta = { resultado };
      } catch (e) {
        // O Error vem do contexto do vm (outro "realm"): instanceof não serve.
        const mensagem = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
        resposta = { erro: mensagem };
      }
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify(resposta));
      return;
    }

    res.writeHead(404).end();
  })
  .listen(PORTA, () => console.log(`Apps Script local em http://localhost:${PORTA}`));
