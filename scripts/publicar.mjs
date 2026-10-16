// Publica o app: build, envia o código (clasp push) e atualiza a implantação
// do app da web. Reaproveita sempre a mesma implantação, para o endereço
// salvo na tela inicial do tablet nunca mudar. Na primeira vez, cria uma.

import { execSync } from 'node:child_process';

const rodar = (cmd) => execSync(cmd, { stdio: 'inherit' });
const ler = (cmd) => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

function implantacoes() {
  const saida = ler('npx clasp deployments --json');
  const json = saida.slice(saida.indexOf('['));
  // A implantação @HEAD (sem versão) é a de teste do editor; não serve.
  return JSON.parse(json).filter((d) => d.versionNumber);
}

let sha = 'sem-git';
try {
  sha = ler('git rev-parse --short HEAD').trim();
} catch {}
const descricao = `${new Date().toISOString().slice(0, 16).replace('T', ' ')} (${sha})`;

rodar('npm run enviar');

const existentes = implantacoes().sort((a, b) => b.versionNumber - a.versionNumber);
if (existentes.length) {
  const { deploymentId } = existentes[0];
  rodar(`npx clasp deploy --deploymentId ${deploymentId} --description "${descricao}"`);
  console.log(`\nApp atualizado no mesmo endereço:\nhttps://script.google.com/macros/s/${deploymentId}/exec`);
} else {
  rodar(`npx clasp deploy --description "${descricao}"`);
  const [nova] = implantacoes();
  console.log(
    `\nPrimeira publicação feita. Endereço do app (salve na tela inicial do tablet):\n` +
      `https://script.google.com/macros/s/${nova.deploymentId}/exec`,
  );
}
