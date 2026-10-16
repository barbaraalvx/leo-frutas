# Léo Frutas · app de notas de pedido

Web app para o balcão da Léo Frutas (box 24, CEASA João Pessoa): montar **notas de pedido não fiscais** em poucos toques e imprimir em A4. Preços e notas ficam numa planilha Google; um painel mostra os números de venda.

- Especificação completa: `especificacao/especificacao-app-leo-frutas.md` (fonte de verdade do comportamento).
- Visual: `design-system/README.md` e `design-system/tokens.css` (fonte de verdade de cores, fontes, medidas e componentes). Nunca inventar cor ou medida fora dos tokens.
- Interface, código e mensagens em **português**.

## Stack

- **Planilha:** Google Sheets, abas `Produtos`, `Notas`, `Itens`, `Config` (cabeçalhos exatos na seção 3 da especificação).
- **Backend:** Google Apps Script ligado à planilha, como app da web (`doGet`). TypeScript em `apps-script/`, empacotado pelo esbuild num `Code.js` só (o clasp 3 não compila TS). Deploy com `clasp`. Fuso `America/Fortaleza`.
- **Frontend:** React 18 + TypeScript + Vite, empacotado num único HTML (`vite-plugin-singlefile`).
- **Build:** tudo vai para `apps-script/build/` (`index.html`, `Code.js`, `appsscript.json`), que é o `rootDir` do clasp. Fora do git.
- **Testes:** Vitest (regras, API simulada e servidor com planilha falsa) e Playwright (projeto `dev` com a API simulada; projeto `producao` com o build de verdade num "Apps Script" local).

## Comandos

```bash
npm run dev         # app local em http://localhost:5173 com a API simulada (latência de 800 ms)
npm test            # Vitest, uma vez
npm run test:watch  # Vitest em modo observação
npm run test:e2e    # Playwright: dev (porta 5174) + produção (5175); PDFs em test-results/
npm run test:tudo   # Vitest + Playwright
npm run typecheck   # tsc do app e do servidor (apps-script/tsconfig.json)
npm run build       # typecheck + build:web + build:servidor → apps-script/build/
npm run enviar      # build + clasp push --force (atualiza o código; a URL /dev já reflete)
npm run publicar    # enviar + atualiza a implantação do app da web (mesma URL /exec de sempre)
```

`npx vite-node scripts/servidor-local.ts` (depois de `npm run build`) sobe o build de produção em http://localhost:5175 com a planilha em memória; `GET /__planilha` mostra o que foi gravado.

## Acesso e publicação

**Modelo de acesso** (difere da seção 2 da especificação, decidido com a Bárbara em 16/10/2026):
- App da web com **"Executar como: quem acessa"** e **"Quem pode acessar: qualquer pessoa com conta Google"** (`apps-script/appsscript.json`).
- Quem pode usar = quem é **editor da planilha**. O compartilhamento da planilha é a lista de convidados; não há senha nem lista no código. Cada pessoa usa a própria conta Google, em qualquer aparelho.
- Sem acesso: `doGet` mostra uma página explicando (com o e-mail da conta) e a API devolve `MENSAGEM_SEM_ACESSO` (`apps-script/acesso.ts`).
- A lista `usuarios_permitidos` da especificação foi descartada: com contas Gmail, quando o script roda como o dono, o Google não informa o e-mail de quem acessa.
- Planilha deve ser **do Léo (sogro da Bárbara)**, não da Bárbara. Ela fica como editora e publica com a própria conta.

**Situação atual:** planilha e script de **teste** na conta da Bárbara (p4rkj13un@gmail.com), publicados em
https://script.google.com/macros/s/AKfycbxo_pHSkPlZ6t2VDTrPYpBzP_FiUhrX4g7NyAYNA8bwxG-Pm2etIRGqnTOh-PJO6ik7/exec.
Não usar para dados reais.

**Pendente: mudar para a planilha do Léo** (quando a Bárbara avisar que ele criou a planilha):
1. Ele cria no Google Planilhas (pelo celular serve) uma planilha em branco "Léo Frutas · Sistema" e compartilha com a Bárbara como editora.
2. Guardar o `.clasp.json` de teste (ex.: `.clasp.teste.json`) e rodar `npx clasp create --type sheets --parentId <id da planilha dele> --rootDir apps-script/build`.
3. `npm run enviar`; na planilha, menu **Léo Frutas › Preparar planilha**.
4. `npm run publicar` (cria a implantação e mostra a URL nova; atualizar este arquivo).
5. Nos aparelhos dele: abrir a URL logado na conta dele, autorizar uma vez, Chrome **⋮ › Adicionar à tela inicial**.
6. A Bárbara decide se apaga a planilha de teste.

**Primeira vez numa máquina nova:** ativar a "API do Google Apps Script" em https://script.google.com/home/usersettings e `npx clasp login`. Autorizar o script na primeira execução ("app não verificado" → Avançado → acessar).

**Cuidado conhecido do Apps Script:** com várias contas Google logadas no mesmo navegador, o app pode abrir com a conta errada. Nos aparelhos do balcão, deixar só a conta de quem usa.

## Estrutura

```
especificacao/      especificação do app
design-system/      README, tokens.css, logo (importados pelo app, não editar sem pedido)
apps-script/
  Code.ts           doGet (injeta window.LEO_FRUTAS), menu da planilha, exporta a API protegida
  acesso.ts         quem pode usar: erro de permissão → mensagem; página "sem acesso"
  api.ts            funções da seção 7.2, escrita sob LockService
  planilha.ts       acesso às abas por nome de coluna + conversões planilha ⇄ app
  setup.ts          cria abas/cabeçalhos/formatos e dados iniciais (idempotente)
  testes/falsos.ts  SpreadsheetApp/LockService/HtmlService falsos (Vitest e servidor local)
  build/            gerado: o que o clasp envia
scripts/
  build-servidor.mjs  esbuild → Code.js + funções de topo para o Apps Script
  publicar.mjs        enviar + reaproveita a implantação existente
  servidor-local.ts   "Apps Script" local para testar o build de produção
web/
  vite.config.ts    root = web/, build vai para ../apps-script/build, config do Vitest
  src/
    dominio/        regras puras e testadas: calculo, formatacao, nota, produtos (+ pendentes da tela Preços),
                    notas (filtro de período), painel, validacao
                    (usadas pelo app E pelo servidor: o servidor importa de web/src/dominio)
    api/            contrato (tipos.ts), simulada.ts, appsScript.ts (google.script.run), index.ts escolhe
    telas/          NovaNota, Notas, Precos, Painel
    componentes/    Menu, CartaoProduto, LinhaNota, NotaImpressa, Dialogo, FormularioProduto, Interruptor,
                    GraficoVendas (SVG próprio, sem biblioteca)…
    estilos/        global.css (importa design-system/tokens.css)
tests/              Playwright: nota de exemplo, Nova nota, impressão, preços, notas, painel, producao
```

## Regras que não podem quebrar

- **Dinheiro em centavos (inteiro)** e **quantidade em milésimos (inteiro)**: 1,200 kg = `1200`, 20 un. = `20000`. Nada de float em conta de dinheiro. Conversão para número com 2 casas só ao gravar na planilha.
- `valor_calculado = arredondar(quantidade × preço)` ao centavo, meio para cima (`dominio/calculo.ts`).
- Valor final editável à mão → linha "ajustada"; linha ajustada **não recalcula** quando a quantidade muda. `ajustado` = valor final ≠ calculado.
- Preço alterado na linha vale só para aquela nota. Nome, tipo e preço são copiados para o item.
- Formatos: `R$ 1.234,56`, peso `1,200`, nota `0128`, data `16/10/2026 14:30`, sempre `tabular-nums` em números.
- Busca sem acento e sem diferenciar maiúsculas (`normalizarBusca`).
- O app nunca apaga linhas: cancelar muda `status`, tirar produto muda `ativo`.
- Toda chamada ao servidor passa por `web/src/api`; telas nunca chamam `google.script.run` direto. Erros com mensagem em português.
- Telas usam o contrato `Api` e funcionam igual com a simulada e a real.
- Contraste: texto sobre `--laranja-500` é `--tinta-900` (nunca branco); texto laranja pequeno usa `--laranja-700`. Alvo de toque ≥ 44 px.

## Detalhes de implementação

- **API simulada em dev** guarda o estado em `localStorage` (`leo-frutas:simulada`), para a aba de impressão achar a nota e os dados sobreviverem a recarregar. Para zerar: apagar essa chave. Em dev ela fica em `window.__apiSimulada` (os testes usam `definirOffline(true)` e `salvarNota` direto).
- **Impressão:** `?view=nota&numero=N` renderiza só `NotaImpressa` e chama `window.print()` (pulado quando `navigator.webdriver`, ou seja, no Playwright).
- **Dentro do Apps Script** o app roda num iframe e não enxerga a URL real. O `doGet` injeta `window.LEO_FRUTAS = { urlApp, parametros }` no `<head>` (sem template: o bundle pode conter `<?`). O app usa `parametrosDaPagina()` e `urlImpressao()` de `web/src/api`.
- **Servidor:** funções públicas precisam estar em `FUNCOES_PUBLICAS` (`scripts/build-servidor.mjs`); o build falha se alguma não existir em `Code.ts`. Nunca devolver `Date` ao app (só ISO). Texto livre gravado passa por `textoSeguro` (evita virar fórmula). Datas do painel usam UTC−3 fixo (`diaLocal`), igual no navegador e no Apps Script.
- **Planilha editável à mão:** colunas achadas pelo nome do cabeçalho; aceita "22,00", "peça", "sim". Linhas incompletas são ignoradas. O número da nota nunca repete, mesmo se `proximo_numero` for baixado à mão.
- **CSS:** `global.css` é importado primeiro em `main.tsx` e tem o que é compartilhado (botões, campos, busca, abas, selos, diálogo, interruptor); o CSS de cada tela vem depois e pode sobrescrever. Sem `window.confirm`/`alert`: confirmações usam `Dialogo`.
- **Produtos** vivem no `App` (carregados uma vez); a tela Preços devolve a lista nova depois de salvar e a Nova nota já vê. Na tela Preços, preço/ativo/ordem ficam pendentes até "Salvar preços"; o formulário (novo/editar) salva na hora. Sair da tela com pendências pede confirmação (`App`) e fechar a aba dispara o aviso do navegador.
- **Notas:** busca espera 300 ms parada; respostas fora de ordem são descartadas; 50 por página.
- **Painel:** números vêm prontos de `getPainel` (servidor usa `calcularPainel`). Barras em `--laranja-500`, hover `--laranja-400` (o README pede `--laranja-400` nas barras, mas ele reprova no validador de paleta: claro demais, 2,0:1 sobre branco). Dias fora do período em `--tinta-300` como contexto, com legenda. Valor direto só sobre "hoje" e só se couber (faixa ≥ 56 px); todos os valores na dica (hover/foco) e em "Ver em tabela". Números grandes sem `tabular-nums` e sem quebrar linha.
- **Breakpoint único de 1023 px:** abaixo dele o menu vira barra inferior e a nota vira gaveta.
- Playwright fixado em 1.63.0 (o 1.64.1 não resolvia no registro em 16/10/2026). Roda com 2 workers e `expect` de 10 s: mais que isso estoura a memória da máquina da Bárbara.
- Nos testes, radios do formulário são marcados por papel (`getByRole('radio').check()`): o input invisível fica por cima do rótulo para aumentar a área de toque.

## Fases (seção 8 da especificação)

1. ✅ **Base:** Vite + React + TS, tokens, layout com menu, API simulada, regras em `dominio/` com Vitest.
2. ✅ Nova nota (6.1, com rascunho no `localStorage`), pré-visualização (6.2) e nota A4 (6.5); Playwright com a nota de exemplo (R$ 178,40) e PDF.
3. ✅ Apps Script + planilha: `setup()`, API, `doGet` com `?view=nota&numero=N`, `npm run publicar`. Publicado e testado pela Bárbara na planilha de teste. **Falta:** mudar para a planilha do Léo (ver "Acesso e publicação").
4. ✅ Preços (6.4) e Notas (6.3), com cancelamento e reimpressão.
5. ✅ Painel (6.6): indicadores com variação, gráfico de vendas por dia, top 10.
6. Acabamento: rascunho e cache no `localStorage`, erros, ícone, instruções de balcão.

Cada fase termina com `npm test` e `npm run typecheck` passando. Conferir os critérios de aceite (seção 9) no fim.
