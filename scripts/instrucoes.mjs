// Folha de instruções de uma página para o balcão (fase 6), com QR code do
// endereço do app. Gera instrucoes/balcao.html e instrucoes/balcao.pdf (A4).
// Uso: npm run instrucoes -- https://script.google.com/macros/s/…/exec

import { chromium } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const url = process.argv[2];
if (!url || !/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(url)) {
  console.error('Passe o endereço do app: npm run instrucoes -- https://script.google.com/macros/s/…/exec');
  process.exit(1);
}

const raiz = fileURLToPath(new URL('..', import.meta.url));
const tokens = readFileSync(`${raiz}design-system/tokens.css`, 'utf8');
const logo = readFileSync(`${raiz}design-system/logo-leo-frutas.png`).toString('base64');
const qr = await QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#1B1A2A' } });

const escapar = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Léo Frutas · Como usar o app de notas</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
<style>
${tokens}
@page { size: A4; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; color: var(--tinta-900); font-family: var(--fonte-ui); font-size: 12.5pt; line-height: 1.4; background: #fff; }
.folha { width: 186mm; margin: 0 auto; }
header { display: flex; align-items: center; gap: 6mm; padding-bottom: 4mm; border-bottom: 2mm solid var(--laranja-500); }
header img { width: 22mm; height: 22mm; }
h1 { margin: 0; font-family: var(--fonte-titulo); font-size: 22pt; font-weight: 800; }
header p { margin: 1mm 0 0; color: var(--tinta-500); font-size: 11pt; }
h2 { margin: 0 0 2mm; font-family: var(--fonte-titulo); font-size: 14pt; font-weight: 800; }
section { margin-top: 5mm; }
.nota { padding: 4mm 5mm; border-radius: 3mm; background: var(--laranja-50); border: 0.4mm solid var(--laranja-200); }
ol { margin: 0; padding: 0; list-style: none; counter-reset: passo; }
ol li { counter-increment: passo; position: relative; padding-left: 10mm; margin: 2.2mm 0; }
ol li::before { content: counter(passo); position: absolute; left: 0; top: 0.2mm; width: 7mm; height: 7mm; border-radius: 50%;
  background: var(--laranja-500); color: var(--tinta-900); font-weight: 700; font-size: 11pt; display: grid; place-items: center; }
.botao { display: inline-block; padding: 0 2mm; border-radius: 1.2mm; background: var(--laranja-500); color: var(--tinta-900);
  font-weight: 700; white-space: nowrap; }
.botao--verde { background: var(--verde-700); color: #fff; }
.menu { display: inline-block; padding: 0 2mm; border-radius: 1.2mm; background: var(--verde-900); color: var(--verde-100);
  font-weight: 600; white-space: nowrap; }
.selo { display: inline-block; padding: 0 2mm; border-radius: 99mm; background: var(--laranja-100); color: var(--laranja-700);
  font-weight: 600; font-size: 10.5pt; }
.grade { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 6mm; }
.grade section { margin-top: 0; }
.grade p { margin: 0; }
.calma { padding: 3mm 5mm; border-left: 1.5mm solid var(--verde-700); background: var(--verde-50); }
.calma p { margin: 0; }
.instalar { display: grid; grid-template-columns: 34mm 1fr; gap: 6mm; align-items: center; margin-top: 6mm; padding: 4mm 5mm;
  border: 0.4mm dashed var(--tinta-300); border-radius: 3mm; }
.instalar svg { width: 34mm; height: 34mm; display: block; }
.instalar ol li { margin: 1.5mm 0; font-size: 11pt; }
.instalar ol li::before { width: 6mm; height: 6mm; font-size: 10pt; }
.url { margin-top: 2mm; color: var(--tinta-500); font-size: 8pt; word-break: break-all; }
</style>
</head>
<body><div class="folha">
<header>
  <img src="data:image/png;base64,${logo}" alt="">
  <div>
    <h1>Como usar o app de notas</h1>
    <p>Léo Frutas · Box 24 · CEASA João Pessoa</p>
  </div>
</header>

<section class="nota">
  <h2>Fazer uma nota</h2>
  <ol>
    <li>Toque no ícone <strong>Léo Frutas</strong> na tela inicial.</li>
    <li>Toque nos produtos. Fruta por <span class="selo">kg</span>: digite o peso, por exemplo <strong>1,2</strong>.
      Por <span class="selo">un.</span>, <span class="selo">peça</span> ou <span class="selo">caixa</span>: cada toque soma 1 (ou use − e +).</li>
    <li>Vai cobrar outro valor? Toque no valor da linha e digite. Aparece <span class="selo">ajustado</span>.</li>
    <li>Se quiser, escreva o nome do cliente.</li>
    <li>Toque em <span class="botao">Gerar nota</span> e depois em <span class="botao botao--verde">Imprimir</span>.</li>
  </ol>
</section>

<section class="calma">
  <p><strong>Caiu a internet ou deu erro?</strong> A nota não se perde: ela fica na tela.
  Quando a internet voltar, toque em <strong>Tentar de novo</strong>. Ela não sai repetida.</p>
</section>

<section class="grade">
  <section>
    <h2>Errou uma nota já feita</h2>
    <p><span class="menu">Notas</span> → toque na nota → <strong>Cancelar nota</strong>. Depois faça uma nova.</p>
  </section>
  <section>
    <h2>Imprimir de novo</h2>
    <p><span class="menu">Notas</span> → toque na nota → <span class="botao botao--verde">Reimprimir</span>.</p>
  </section>
  <section>
    <h2>Mudar um preço</h2>
    <p><span class="menu">Preços</span> → toque no preço e digite → <span class="botao" style="background:var(--tinta-900);color:#fff">Salvar preços</span>.</p>
  </section>
  <section>
    <h2>Ver as vendas</h2>
    <p><span class="menu">Painel</span> mostra quanto vendeu hoje, na semana e no mês.</p>
  </section>
</section>

<section class="instalar">
  ${qr}
  <div>
    <h2>Instalar num aparelho novo</h2>
    <ol>
      <li>Aponte a câmera do aparelho para o quadrado ao lado e abra o link.</li>
      <li>Entre com a conta Google que tem acesso à planilha da loja.</li>
      <li>Na primeira vez, toque em <strong>Autorizar</strong>.</li>
      <li>No Chrome, toque em <strong>⋮</strong> → <strong>Adicionar à tela inicial</strong>.</li>
    </ol>
    <p class="url">${escapar(url)}</p>
  </div>
</section>
</div></body></html>`;

mkdirSync(`${raiz}instrucoes`, { recursive: true });
writeFileSync(`${raiz}instrucoes/balcao.html`, html);

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.setContent(html, { waitUntil: 'networkidle' });
await pagina.evaluate(() => document.fonts.ready);
await pagina.pdf({ path: `${raiz}instrucoes/balcao.pdf`, preferCSSPageSize: true, printBackground: true });
const altura = await pagina.evaluate(() => document.querySelector('.folha').scrollHeight);
await navegador.close();

// 297 mm − 2 × 12 mm de margem = 273 mm ≈ 1032 px a 96 dpi.
if (altura > 1032) console.warn(`Atenção: a folha passou de uma página (${altura}px).`);
console.log('instrucoes/balcao.html e instrucoes/balcao.pdf gerados.');
