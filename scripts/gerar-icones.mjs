// Gera os ícones (icones/icone-64.png para a aba; 192 e 512 para a tela inicial) a
// partir da logo, desenhando-a num quadrado creme com margem (o Android
// recorta o ícone em círculo ou quadrado arredondado). Usa o Chromium do
// Playwright, já instalado para os testes. Uso: node scripts/gerar-icones.mjs

import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const logo = readFileSync(`${raiz}design-system/logo-leo-frutas.png`).toString('base64');
mkdirSync(`${raiz}icones`, { recursive: true });

const navegador = await chromium.launch();
// 64: ícone da aba do navegador (vai embutido no HTML, precisa ser leve).
for (const tamanho of [64, 192, 512]) {
  const pagina = await navegador.newPage({ viewport: { width: tamanho, height: tamanho } });
  // --laranja-50 de fundo; a logo ocupa 80% (zona segura de ícone adaptável).
  await pagina.setContent(`<!doctype html>
    <body style="margin:0;width:${tamanho}px;height:${tamanho}px;display:grid;place-items:center;background:#FFF6EC">
      <img src="data:image/png;base64,${logo}" style="width:80%;height:80%;object-fit:contain">
    </body>`);
  await pagina.locator('img').evaluate((img) => img.decode());
  await pagina.screenshot({ path: `${raiz}icones/icone-${tamanho}.png`, omitBackground: false });
  await pagina.close();
}
await navegador.close();
console.log('icones/icone-64.png, icone-192.png e icone-512.png gerados.');
