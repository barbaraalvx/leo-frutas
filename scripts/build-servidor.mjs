// Empacota apps-script/*.ts (e as regras de web/src/dominio) num Code.js só,
// em apps-script/build/, junto com o appsscript.json. O Apps Script só
// enxerga funções declaradas no topo do arquivo, então para cada função
// pública geramos `function nome() { return LeoFrutas.nome(...) }`.

import { build } from 'esbuild';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const saida = `${raiz}apps-script/build`;

/** Tudo o que o app (google.script.run), o menu ou o Google chamam pelo nome. */
const FUNCOES_PUBLICAS = [
  'doGet',
  'onOpen',
  'setup',
  'prepararPlanilhaPeloMenu',
  'getDadosIniciais',
  'salvarNota',
  'listarNotas',
  'getNota',
  'cancelarNota',
  'salvarProdutos',
  'getPainel',
];

const ponte = FUNCOES_PUBLICAS.map(
  (nome) => `function ${nome}() { return LeoFrutas.${nome}.apply(null, arguments); }`,
).join('\n');

mkdirSync(saida, { recursive: true });

await build({
  entryPoints: [`${raiz}apps-script/Code.ts`],
  outfile: `${saida}/Code.js`,
  bundle: true,
  format: 'iife',
  globalName: 'LeoFrutas',
  target: 'es2020',
  charset: 'utf8',
  // Restringe a permissão à planilha ligada ao script (não a todo o Drive).
  banner: { js: '/** @OnlyCurrentDoc */' },
  footer: { js: `\n// Funções visíveis para o Apps Script\n${ponte}\n` },
  logLevel: 'warning',
});

copyFileSync(`${raiz}apps-script/appsscript.json`, `${saida}/appsscript.json`);

// Confere que cada função pública existe de verdade no pacote.
const contexto = vm.createContext({});
vm.runInContext(readFileSync(`${saida}/Code.js`, 'utf8'), contexto);
const faltando = FUNCOES_PUBLICAS.filter((n) => typeof contexto.LeoFrutas?.[n] !== 'function');
if (faltando.length) {
  console.error(`Funções públicas sem implementação em Code.ts: ${faltando.join(', ')}`);
  process.exit(1);
}

console.log(`apps-script/build/Code.js pronto (${FUNCOES_PUBLICAS.length} funções públicas).`);
