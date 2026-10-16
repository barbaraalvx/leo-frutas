# Especificação · App de notas de pedido Léo Frutas

Versão 1 · 16/10/2026

Documento para desenvolver o app com o Claude Code. Descreve o que o app faz, a stack escolhida, a estrutura da planilha, as regras de preço, as telas e a ordem de construção. O visual está definido no design system em `design-system/` (README.md e tokens.css), que é a fonte de verdade para cores, fontes, medidas e componentes.

---

## 1. Objetivo

Web app simples para o balcão da Léo Frutas (box 24 da CEASA de João Pessoa) montar **notas de pedido não fiscais** em poucos toques e imprimi-las em A4. Os preços ficam numa planilha que a família consegue abrir e conferir, e um painel mostra os números de venda.

### O que está dentro

- Montar uma nota: escolher produtos, informar quantidade ou peso, ajustar valores à mão, digitar o nome do cliente, gerar e imprimir.
- Preço por tipo de venda: **kg, peça, unidade, caixa**.
- Valor de cada linha calculado automaticamente e **editável manualmente**.
- Gerenciar produtos e preços (criar, editar, desativar).
- Lista de notas emitidas, com reimpressão e cancelamento.
- Painel simples de números.
- Todos os dados guardados numa planilha Google.

### O que está fora

- Cadastro de clientes (só o nome digitado na nota, texto livre).
- Nota fiscal, impostos, integração com SEFAZ.
- Controle de estoque, contas a receber, formas de pagamento.
- Vários usuários com permissões diferentes.

---

## 2. Stack escolhida

**Planilha:** Google Sheets.
**Backend e hospedagem:** Google Apps Script, publicado como app da web (`doGet`) ligado à própria planilha.
**Frontend:** React 18 + TypeScript, empacotado pelo Vite num único arquivo HTML (`vite-plugin-singlefile`) que o Apps Script serve.
**Deploy:** `clasp` (CLI oficial do Apps Script).
**Testes:** Vitest (regras de preço e formatação) e Playwright (fluxos e layout de impressão) contra um backend simulado local.

### Por que essa escolha

- **A planilha é o banco de dados de verdade.** O Léo ou a Bárbara abrem o Google Sheets no celular e veem preços e notas sem depender do app. Excel ou CSV num computador exigiriam uma máquina ligada servindo o arquivo.
- **Custo zero e nada para manter.** Apps Script hospeda o app de graça, sem servidor, domínio ou banco a pagar. O endereço do app é um link que se salva na tela inicial do tablet.
- **Sem senha nova.** O acesso é pela conta Google da loja.
- **Backup e histórico automáticos** pelo próprio Google (histórico de versões da planilha).
- **React + Vite** deixa o Claude Code desenvolver e testar localmente com recarga rápida, e o build final vira um HTML só, que é o formato que o Apps Script aceita.

### Limitações aceitas

- Precisa de internet para salvar notas e carregar preços. Cada chamada ao Apps Script leva cerca de 1 a 2 segundos; a interface não pode travar esperando (ver 7.4).
- O app roda dentro de um iframe do Google. A impressão abre a nota numa aba própria (ver 6.5) para não depender do iframe.
- Cota gratuita do Apps Script é muito maior do que o uso de uma banca (dezenas de notas por dia).

### Acesso

- Criar (ou usar) **uma conta Google da loja**, dona da planilha e do script.
- Publicar o app da web com **"Executar como: eu"** e **"Quem pode acessar: somente eu"**. Os aparelhos do balcão ficam logados nessa conta. Assim ninguém de fora consegue abrir ou gravar.
- Se no futuro outra pessoa precisar de acesso com a própria conta, trocar para "Qualquer pessoa com conta Google" e validar o e-mail contra a lista `usuarios_permitidos` da aba `Config`.

---

## 3. Planilha (modelo de dados)

Uma planilha chamada **"Léo Frutas · Sistema"** com quatro abas. A primeira linha de cada aba é o cabeçalho, com estes nomes exatos. O script cria as abas e os cabeçalhos se não existirem (função `setup()`).

### 3.1 Aba `Produtos`

| Coluna | Tipo | Exemplo | Observação |
|---|---|---|---|
| `id` | texto | `p_0007` | Gerado pelo app, nunca muda |
| `nome` | texto | `Maçã verde` | Como aparece no cartão e na nota |
| `categoria` | texto | `Frutas` | `Frutas` ou `Verduras e legumes` |
| `tipo_venda` | texto | `kg` | `kg`, `peca`, `unidade`, `caixa` |
| `preco` | número | `22,00` | Preço por kg ou por peça/unidade/caixa. Vazio = "definir preço" |
| `ativo` | sim/não | `TRUE` | Desativado some da tela de nota, mas continua nas notas antigas |
| `ordem` | número | `7` | Ordem na grade (menor primeiro) |
| `atualizado_em` | data-hora | `16/10/2026 14:30` | Preenchido ao salvar preço |

### 3.2 Aba `Notas` (uma linha por nota)

| Coluna | Tipo | Exemplo |
|---|---|---|
| `numero` | número | `128` (exibido como `0128`) |
| `data_hora` | data-hora | `16/10/2026 14:30` |
| `cliente` | texto | `Mercadinho São José` (pode ficar vazio) |
| `total` | número | `178,40` |
| `qtd_itens` | número | `4` |
| `status` | texto | `emitida` ou `cancelada` |
| `observacao` | texto | campo livre opcional |

### 3.3 Aba `Itens` (uma linha por item de nota)

| Coluna | Tipo | Exemplo | Observação |
|---|---|---|---|
| `numero_nota` | número | `128` | Liga à aba `Notas` |
| `produto_id` | texto | `p_0007` | |
| `produto_nome` | texto | `Maçã verde` | Cópia do nome no momento da venda |
| `tipo_venda` | texto | `kg` | Cópia |
| `quantidade` | número | `1,200` | kg com 3 casas; outros tipos inteiros |
| `preco_unitario` | número | `22,00` | Preço usado nesta nota |
| `valor_calculado` | número | `26,40` | quantidade × preço |
| `valor_final` | número | `26,00` | O que vale na nota |
| `ajustado` | sim/não | `TRUE` | `valor_final` ≠ `valor_calculado` |

Nome, tipo e preço são copiados para o item, para que mudar um preço amanhã não altere notas já emitidas.

### 3.4 Aba `Config` (chave e valor)

| chave | valor |
|---|---|
| `nome_loja` | `Léo Frutas` |
| `vendedor` | `Léo` |
| `telefone` | `(83) 99911-7487` |
| `endereco` | `R. Pres. Raniere Mazilli, s/n, Box 24, CEASA` |
| `cidade` | `João Pessoa/PB` |
| `proximo_numero` | `1` |
| `rodape_nota` | `Documento sem valor fiscal.` |

### 3.5 Regras de gravação

- O número da nota é gerado no servidor com `LockService` (lê `proximo_numero`, grava a nota e os itens, incrementa), para nunca repetir número mesmo com dois aparelhos.
- Valores em dinheiro são calculados no app em **centavos (inteiros)** e gravados na planilha como número com 2 casas.
- Fuso horário do script: `America/Fortaleza` (mesmo horário de João Pessoa), definido em `appsscript.json`.
- O app nunca apaga linhas. Cancelar nota muda `status`; tirar produto muda `ativo`.

### 3.6 Dados iniciais

`setup()` preenche `Produtos` com a relação atual (arquivo `Relação de produtos - Léo Frutas.md`):

| Produto | Categoria | Tipo | Preço |
|---|---|---|---|
| Laranja pêra | Frutas | unidade | 0,50 |
| Maçã | Frutas | kg | 17,00 |
| Maçã verde | Frutas | kg | 22,00 |
| Uva verde sem caroço | Frutas | kg | 23,00 |
| Uva preta | Frutas | kg | 20,00 |
| Morango | Frutas | caixa | 60,00 |
| Manga Tommy | Frutas | kg | 8,00 |
| Manga Palmer | Frutas | kg | 10,00 |
| Melão | Frutas | kg | 7,00 |
| Melancia | Frutas | peça | 22,00 |
| Maracujá | Frutas | kg | 14,00 |
| Limão | Frutas | kg | 15,00 |
| Kiwi | Frutas | kg | 32,00 |
| Uva passa | Frutas | kg | 32,00 |
| Ameixa | Frutas | kg | 23,00 |
| Abobrinha | Verduras e legumes | kg | (sem preço) |
| Acelga | Verduras e legumes | kg | (sem preço) |
| Alface | Verduras e legumes | unidade | (sem preço) |
| Alecrim | Verduras e legumes | unidade | (sem preço) |
| Batata inglesa | Verduras e legumes | kg | (sem preço) |
| Batata doce | Verduras e legumes | kg | (sem preço) |
| Beterraba | Verduras e legumes | kg | (sem preço) |
| Cebola branca | Verduras e legumes | kg | (sem preço) |
| Cebola roxa | Verduras e legumes | kg | (sem preço) |

> A relação escreve "Manga Tony" e "Manga Palm"; aqui foram grafadas como as variedades Tommy e Palmer. "Maçã normal" virou "Maçã". Alface e alecrim estão marcados como "não é quilo" sem dizer o tipo, então entraram como unidade. Tudo isso pode ser corrigido na tela Preços.

---

## 4. Regras de preço e cálculo

### 4.1 Tipos de venda

| Tipo | Selo | Como se informa a quantidade | Casas | Exemplo na nota |
|---|---|---|---|---|
| `kg` | `kg` (verde) | Campo de peso, teclado numérico | 3 (`1,200`) | `1,200 kg × R$ 22,00` |
| `unidade` | `un.` (pêssego) | Contador − / + ou digitado | 0 | `20 un. × R$ 0,50` |
| `peca` | `peça` (pêssego) | Contador − / + ou digitado | 0 | `1 peça × R$ 22,00` |
| `caixa` | `caixa` (pêssego) | Contador − / + ou digitado | 0 | `2 caixa × R$ 60,00` |

### 4.2 Cálculo de cada linha

1. `valor_calculado = arredondar(quantidade × preco_unitario)` ao centavo, meio para cima.
2. `valor_final` começa igual ao `valor_calculado`.
3. O vendedor pode **digitar outro valor final** na linha. A linha ganha o selo "ajustado" (`--laranja-700`) e o link "voltar ao calculado".
4. Depois de ajustada, a linha **não recalcula sozinha** se a quantidade mudar; mostra o valor calculado novo em cinza abaixo, para o vendedor decidir.
5. O **preço unitário** também pode ser alterado só para aquela nota (toque no preço da linha). Isso não muda o preço na planilha.
6. Produto sem preço cadastrado: ao entrar na nota, a linha abre já pedindo o preço unitário.

### 4.3 Total

- `total = soma dos valor_final`. Não há desconto geral nem acréscimo nesta versão.
- O botão **Gerar nota** fica desativado se a nota não tiver itens, se algum item tiver quantidade zero ou valor final vazio.

### 4.4 Formatação

- Dinheiro: `R$ 1.234,56` (pt-BR), sempre com `font-variant-numeric: tabular-nums`.
- Peso: `1,200` (vírgula, 3 casas). O campo aceita vírgula ou ponto como separador decimal (`1,2` ou `1.2`) e completa para 3 casas ao sair do campo.
- Número da nota: 4 dígitos com zeros à esquerda (`0128`); passa de 9999 normalmente.
- Data: `16/10/2026 14:30`.

---

## 5. Navegação

Menu lateral (barra inferior no celular) com quatro itens, ícones Lucide:

| Item | Ícone | Tela |
|---|---|---|
| Nova nota | `receipt` | 6.1 (tela inicial) |
| Notas | `files` | 6.3 |
| Preços | `tag` | 6.4 |
| Painel | `bar-chart-3` | 6.6 |

Sem tela de login (acesso pela conta Google, ver seção 2) e sem tela de clientes.

---

## 6. Telas

Layouts, medidas e componentes seguem o README do design system (seções 5 e 6). Aqui fica o comportamento.

### 6.1 Nova nota (tela principal)

Três colunas: menu, grade de produtos, coluna da nota (380 px).

**Grade de produtos**
- Topo com a marca e a busca "Buscar produto…". A busca filtra por nome, sem acento e sem diferenciar maiúsculas (`maca` encontra "Maçã").
- Abas: Frutas · Verduras e legumes · Todos.
- Cartão: nome, preço com unidade (`R$ 22,00 /kg`) e selo do tipo. Sem preço: "definir preço" em `--tinta-400`.
- Só produtos ativos, na ordem da coluna `ordem`.
- Tocar no cartão adiciona o produto à nota:
  - `kg`: adiciona a linha e põe o foco no campo de peso.
  - outros: adiciona com quantidade 1; tocar de novo soma 1. O cartão mostra um contador laranja no canto.

**Coluna da nota**
- Cabeçalho "Nova nota" (o número só existe depois de gerar).
- Campo **Cliente** (texto livre, opcional, até 60 caracteres).
- Lista de linhas, a mais recente embaixo. Cada linha: nome, quantidade + unidade, preço unitário, valor final (editável), botão remover.
- Rodapé fixo: total grande (`--texto-2xl`) e botão principal **Gerar nota**.
- Botão secundário **Limpar** com confirmação.

**Gerar nota**
1. Envia a nota ao servidor; o botão mostra "Salvando…" e a tela não trava.
2. Ao voltar, aviso "Nota 0128 salva na planilha" e abre a **pré-visualização** (6.2).
3. Se falhar (sem internet), a nota **continua montada na tela** e aparece um aviso de erro com "Tentar de novo". Nada se perde.

**Rascunho**
- A nota em montagem é guardada no `localStorage` a cada mudança, para sobreviver a recarregar a página ou fechar a aba sem querer.

### 6.2 Pré-visualização da nota

- Mostra a nota exatamente como sai no papel (mesmo componente da impressão), em escala dentro da tela.
- Botões: **Imprimir** (botão verde de confirmação), **Nova nota** (principal, limpa e volta a 6.1), **Voltar**.

### 6.3 Notas

- Lista das notas, mais recentes primeiro: número, data e hora, cliente, total, status.
- Filtros: hoje · 7 dias · 30 dias · tudo; busca por cliente ou número.
- Tocar numa nota abre a pré-visualização com **Reimprimir** e **Cancelar nota**.
- Cancelar pede confirmação e um motivo opcional (vai para `observacao`). Nota cancelada fica riscada na lista e sai do painel; ao reimprimir, mostra a faixa "CANCELADA".
- Não há edição de nota emitida. Para corrigir: cancelar e fazer outra.
- Paginação simples: carrega as 50 mais recentes e "Carregar mais".

### 6.4 Preços

- Tabela: Produto · Categoria · Vende por · Preço · Atualizado em · Ativo.
- **Preço editável na própria linha.** Linha alterada fica com fundo `--laranja-100` até salvar. Botão **Salvar preços** grava todas as alterações de uma vez; aviso verde "Preços salvos na planilha".
- Sair da tela com alterações não salvas pede confirmação.
- **Novo produto:** formulário com nome, categoria, tipo de venda, preço (opcional).
- Editar nome, categoria e tipo de venda pelo mesmo formulário (tocar no nome).
- Ativar ou desativar com um interruptor.
- Reordenar: setas ↑ ↓ na linha (muda a coluna `ordem`).
- Filtro por categoria e busca.

### 6.5 Nota impressa (A4)

Seguir o desenho da seção "Nota impressa (A4)" do README do design system. Pontos obrigatórios:

- `@page { size: A4; margin: 15mm }`, fundo branco, quase tudo em preto.
- Faixa laranja fina no topo (6 px) e total em destaque; o resto sem cor de fundo.
- **Logo** `logo-leo-frutas.png` à esquerda (cerca de 30 mm), embutida no HTML como data URI (reduzir para ~600 px de largura antes de embutir).
- Ao lado da logo: **LÉO FRUTAS**, **"Léo · (83) 99911-7487"** (o vendedor aparece só como "Léo"), endereço e cidade, todos vindos da aba `Config`.
- À direita: **NOTA DE PEDIDO Nº 0128** e data e hora.
- "Cliente: …" (se vazio, a linha some).
- Tabela: Produto · Qtd · Un. · Preço un. · Total. Números à direita, tabular, peso com 3 casas. Linha ajustada à mão não leva marca na impressão.
- TOTAL alinhado à direita.
- Rodapé: **"Documento sem valor fiscal."**
- Uma nota com até ~25 itens cabe numa página; acima disso a tabela continua na página seguinte, repetindo o cabeçalho da tabela (`thead { display: table-header-group }`) e sem cortar linha ao meio.

**Como imprimir:** o botão Imprimir abre a nota numa aba própria, no endereço do app com `?view=nota&numero=128`. O `doGet` serve essa página só com a nota (sem menu) e chama `window.print()` ao carregar. Isso evita problemas de impressão dentro do iframe do Apps Script e permite reimprimir pelo link.

### 6.6 Painel

- Seletor de período: Hoje · 7 dias · 30 dias · Este mês. Padrão: Hoje.
- Quatro indicadores: **Vendas** (soma dos totais), **Notas** (quantidade), **Ticket médio**, **Mais vendido** (produto com maior valor no período).
- Variação contra o período anterior de mesmo tamanho, em verde ou vermelho.
- Gráfico de barras de vendas por dia (últimos 14 dias quando o período for Hoje ou 7 dias; dias do período nos outros), barras `--laranja-400`.
- Lista dos 10 produtos com maior valor vendido no período: nome, quantidade somada com a unidade, valor.
- Notas canceladas não entram em nada.
- Os números são calculados no servidor (Apps Script lê `Notas` e `Itens`) e devolvidos prontos.

---

## 7. Arquitetura

### 7.1 Estrutura do repositório

```
leo-frutas/
├─ CLAUDE.md                  # resumo desta especificação e comandos
├─ especificacao/             # este documento
├─ design-system/             # cópia da pasta do projeto (README, tokens.css, logo)
├─ apps-script/               # código do servidor (vai para o Apps Script via clasp)
│  ├─ appsscript.json         # timeZone America/Fortaleza, webapp executeAs USER_DEPLOYING, access MYSELF
│  ├─ Code.ts                 # doGet, roteamento de views
│  ├─ api.ts                  # funções chamadas pelo frontend
│  ├─ planilha.ts             # leitura e escrita das abas
│  └─ setup.ts                # cria abas, cabeçalhos e dados iniciais
├─ web/                       # frontend React
│  ├─ index.html
│  ├─ src/
│  │  ├─ main.tsx
│  │  ├─ api/                 # cliente: google.script.run em produção, mock em dev
│  │  ├─ dominio/             # regras puras: preço, centavos, formatação
│  │  ├─ telas/               # NovaNota, Notas, Precos, Painel
│  │  ├─ componentes/         # CartaoProduto, LinhaNota, NotaImpressa, Selo…
│  │  └─ estilos/             # importa design-system/tokens.css
│  └─ vite.config.ts          # vite-plugin-singlefile, saída para apps-script/index.html
├─ tests/                     # Playwright
└─ package.json
```

### 7.2 API (funções do Apps Script)

Chamadas pelo frontend com `google.script.run`, embrulhado em Promises num único módulo `web/src/api`. O mesmo módulo tem uma implementação simulada (dados em memória, latência artificial de 800 ms) usada no `npm run dev` e nos testes.

| Função | Entrada | Saída |
|---|---|---|
| `getDadosIniciais()` | | `{ produtos, config }` |
| `salvarNota(nota)` | `{ cliente, itens[] }` | `{ numero, data_hora, total }` |
| `listarNotas(filtro)` | `{ desde?, busca?, offset, limite }` | `{ notas[], temMais }` |
| `getNota(numero)` | número | nota com itens |
| `cancelarNota(numero, motivo)` | | `{ ok }` |
| `salvarProdutos(alteracoes)` | lista de produtos novos ou alterados | `{ produtos }` |
| `getPainel(periodo)` | `hoje`, `7d`, `30d`, `mes` | indicadores, série por dia, top produtos |

Regras do servidor:
- `salvarNota` **recalcula** `valor_calculado` e o total a partir dos itens recebidos e confere com o que veio; respeita `valor_final` e `ajustado` como enviados.
- Toda escrita usa `LockService.getScriptLock()`.
- Erros voltam com mensagem em português para o aviso da tela.

### 7.3 Estado no frontend

- Produtos e config carregados uma vez ao abrir e guardados em memória e no `localStorage` (a tela abre na hora com o cache e atualiza em segundo plano).
- Nota em montagem no `localStorage` (6.1).
- Sem biblioteca de estado; `useReducer` para a nota basta.

### 7.4 Desempenho e uso no balcão

- Abrir o app e já poder tocar em produtos em menos de 2 segundos com cache.
- Toques na grade respondem na hora (tudo local); só "Gerar nota", "Salvar preços" e listas falam com o servidor.
- Alvos de toque de no mínimo 44 px; campo de peso com `inputmode="decimal"`.
- Funciona em tablet deitado, computador e celular (layout responsivo do README).

---

## 8. Ordem de construção

Cada fase termina com testes passando e algo que dá para usar.

1. **Base.** Repositório, Vite + React + TS, tokens do design system, layout com menu, API simulada, Vitest. Regras de preço em `dominio/` com testes (kg com 3 casas, arredondamento, ajuste manual, total em centavos).
2. **Nova nota + impressão (local).** Tela 6.1 completa, pré-visualização 6.2 e nota A4 6.5, tudo com a API simulada. Playwright: montar a nota de exemplo do README (maçã verde 1,200 kg, melancia 1, laranja pêra 20, morango 2 = R$ 178,40) e gerar PDF da impressão para conferir.
3. **Apps Script + planilha.** `setup()`, todas as funções da API, `doGet` com a view de impressão, `clasp push` e primeira publicação. Teste manual na planilha real.
4. **Preços e Notas.** Telas 6.4 e 6.3.
5. **Painel.** Tela 6.6.
6. **Acabamento.** Rascunho no `localStorage`, cache de produtos, mensagens de erro, ícone para a tela inicial do tablet, instruções de uso de uma página para o balcão.

### Passos que precisam da Bárbara

- Criar ou escolher a conta Google da loja.
- Rodar `clasp login` uma vez (abre o navegador para autorizar) e autorizar o script na primeira execução.
- Testar a impressão na impressora da loja (fase 2 gera o PDF; a fase 3 imprime de verdade).

---

## 9. Critérios de aceite

- Montar e imprimir a nota de exemplo leva menos de 30 segundos para quem já conhece o app.
- Peso de `1,2` vira `1,200 kg` e o valor da maçã verde dá `R$ 26,40`.
- Mudar o valor final de uma linha para `R$ 26,00` marca "ajustado", o total acompanha e a planilha grava `valor_calculado 26,40`, `valor_final 26,00`, `ajustado TRUE`.
- Dois aparelhos gerando nota ao mesmo tempo recebem números diferentes e seguidos.
- Mudar o preço da maçã em Preços aparece na planilha e no cartão; notas antigas continuam com o preço antigo.
- A nota impressa cabe em uma folha A4 com até 25 itens, mostra logo, "Léo", telefone, endereço e "Documento sem valor fiscal."
- Sem internet, a nota montada não se perde e pode ser enviada quando a conexão voltar.
- Nota cancelada some do painel e aparece riscada na lista.

---

## 10. Em aberto (decidir depois, sem travar o desenvolvimento)

- Tipo de venda de alface e alecrim (entraram como unidade) e se faz falta um tipo "maço" ou "bandeja".
- Preços das verduras e legumes.
- Se vale guardar notas feitas sem internet para enviar depois automaticamente (hoje: a nota fica na tela até conseguir salvar).
- Desconto geral na nota ou forma de pagamento, caso o Léo peça.

---

## 11. Como usar este documento no Claude Code

1. Criar um repositório vazio `leo-frutas` e copiar para ele esta pasta `especificacao/` e a pasta `design-system/` do projeto.
2. Abrir o Claude Code no repositório e pedir: *"Leia especificacao/especificacao-app-leo-frutas.md e design-system/README.md, crie o CLAUDE.md com o resumo e os comandos, e implemente a fase 1."*
3. Seguir fase por fase (seção 8), conferindo os critérios da seção 9 ao final.
