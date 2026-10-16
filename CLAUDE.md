# Léo Frutas · app de notas de pedido

Web app para o balcão da Léo Frutas (box 24, CEASA João Pessoa): montar **notas de pedido não fiscais** em poucos toques e imprimir em A4. Preços e notas ficam numa planilha Google; um painel mostra os números de venda.

- Especificação completa: `especificacao/especificacao-app-leo-frutas.md` (fonte de verdade do comportamento).
- Visual: `design-system/README.md` e `design-system/tokens.css` (fonte de verdade de cores, fontes, medidas e componentes). Nunca inventar cor ou medida fora dos tokens.
- Interface, código e mensagens em **português**.

## Stack

- **Planilha:** Google Sheets, abas `Produtos`, `Notas`, `Itens`, `Config` (cabeçalhos exatos na seção 3 da especificação).
- **Backend:** Google Apps Script como app da web (`doGet`), deploy com `clasp`. Fuso `America/Fortaleza`.
- **Frontend:** React 18 + TypeScript + Vite, empacotado num único HTML (`vite-plugin-singlefile`) em `apps-script/index.html`.
- **Testes:** Vitest (regras e API simulada); Playwright a partir da fase 2.

## Comandos

```bash
npm run dev         # app local em http://localhost:5173 com a API simulada (latência de 800 ms)
npm test            # Vitest, uma vez
npm run test:watch  # Vitest em modo observação
npm run typecheck   # tsc sem emitir
npm run build       # typecheck + gera apps-script/index.html (arquivo gerado, fora do git)
```

Fase 3 em diante: `npx clasp push` para enviar `apps-script/` ao Apps Script (precisa de `clasp login` feito pela Bárbara).

## Estrutura

```
especificacao/      especificação do app
design-system/      README, tokens.css, logo (importados pelo app, não editar sem pedido)
apps-script/        código do servidor (fase 3) + index.html gerado pelo build
web/
  vite.config.ts    root = web/, build vai para ../apps-script, config do Vitest
  src/
    dominio/        regras puras e testadas: calculo, formatacao, nota (reducer), painel
    api/            contrato (tipos.ts), simulada.ts, appsScript.ts (google.script.run), index.ts escolhe
    telas/          NovaNota, Notas, Precos, Painel
    componentes/    Menu, CartaoProduto, LinhaNota, NotaImpressa…
    estilos/        global.css (importa design-system/tokens.css)
tests/              Playwright (fase 2)
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

## Fases (seção 8 da especificação)

1. ✅ **Base:** Vite + React + TS, tokens, layout com menu, API simulada, regras em `dominio/` com Vitest.
2. Nova nota (6.1), pré-visualização (6.2) e nota A4 (6.5) com a API simulada; Playwright com a nota de exemplo (R$ 178,40) e PDF.
3. Apps Script + planilha: `setup()`, API, `doGet` com `?view=nota&numero=N`, `clasp push`.
4. Preços (6.4) e Notas (6.3).
5. Painel (6.6). A conta já existe em `dominio/painel.ts` para o servidor reaproveitar.
6. Acabamento: rascunho e cache no `localStorage`, erros, ícone, instruções de balcão.

Cada fase termina com `npm test` e `npm run typecheck` passando. Conferir os critérios de aceite (seção 9) no fim.
