# Design system · Léo Frutas

Base visual para o web app de notas de pedido da Léo Frutas, extraída do exemplo **"POS for Restaurant | Table Booking POS System"** (Behance, Prafful Kumar) e aplicada ao produto.

Arquivos desta pasta:

- `README.md`: este guia.
- `tokens.css`: todas as cores, fontes, espaçamentos e raios como variáveis CSS, prontas para importar no app.
- `preview.html`: prévia visual com os componentes montados (também publicada como página).
- `referencia-tela-pos.png`: a tela do exemplo usada como fonte das medidas.
- `logo-leo-frutas.png`: logo atual da loja, recortada em círculo com fundo transparente, para a nota impressa e o topo do app.

> **Sobre a fonte.** O PDF tem 13 páginas, mas todas repetem o mesmo trecho do topo da página do Behance: a capa com a tela "Restro POS", a seção "Overview/Strategy" e os rascunhos de "Brainstorming". As telas finais e o guia de estilo do autor não foram capturados. As cores marcadas como *amostrado* foram medidas pixel a pixel nessas imagens; o resto foi derivado delas.

---

## 1. Princípios (do exemplo para a Léo Frutas)

1. **Fundo cinza, cartões brancos.** O exemplo separa áreas pela cor de fundo (branco sobre `#F5F5F5`), quase sem sombra e sem bordas fortes.
2. **Um laranja só, usado com parcimônia.** O laranja marca apenas o que está ativo ou selecionado (item do menu, aba, botão principal). O resto é tinta escura e cinza.
3. **Selecionado = fundo pêssego + contorno laranja.** Padrão do botão "Home" e da aba "Lunch": fundo `--laranja-100`, borda `--laranja-500` e texto/ícone laranja.
4. **Toque primeiro.** Botões grandes, grade de cartões e menu lateral com ícone + rótulo, pensado para tablet ou computador no balcão.
5. **Rapidez acima de tudo** (do texto "Strategy" do exemplo): montar uma nota deve levar poucos toques, sem telas de cadastro.

## 2. Cores

### Paleta principal (mesma do exemplo)

| Token | Hex | Origem | Uso |
|---|---|---|---|
| `--laranja-500` | `#DD8845` | amostrado | Cor de destaque: contorno ativo, ícone ativo, botão principal (com texto tinta) |
| `--laranja-400` | `#F4A15D` | amostrado | Brilho do laranja: gráficos, hover do botão |
| `--laranja-300` | `#FFD296` | amostrado | Borda da aba ativa |
| `--laranja-200` | `#FFEDDD` | amostrado | Borda suave de área selecionada |
| `--laranja-100` | `#FFF1E8` | amostrado | Fundo de item selecionado |
| `--laranja-50` | `#FFF6EC` | amostrado | Fundo do gradiente de marca |
| `--laranja-700` | `#A9581A` | derivado | Laranja para **texto pequeno** (o `#DD8845` tem só 2,7:1 sobre branco) |
| `--creme-200` → `--creme-400` | `#FBF1D9` → `#FEE49F` | amostrado | Gradiente quente da capa; usar só em tela de entrada e topo do painel |
| `--tinta-900` | `#1B1A2A` | amostrado | Logo, títulos, preços |
| `--tinta-marrom` | `#25160E` | amostrado | Título grande de destaque |
| `--tinta-700` | `#414246` | amostrado | Texto de interface (abas, nomes) |
| `--tinta-500` | `#646368` | amostrado | Texto corrido e descrições |
| `--tinta-400` | `#76767C` | derivado | Menor cinza aceito para texto (4,5:1) |
| `--tinta-300` | `#ADADAD` | amostrado | Ícones e rótulos inativos do menu (decorativo) |
| `--branco` | `#FFFFFF` | amostrado | Cartões, menu lateral, topo |
| `--fundo-app` | `#F5F5F5` | amostrado | Fundo da área de conteúdo |
| `--fundo-secao` | `#EFEFEF` | amostrado | Faixas e seções de apoio |
| `--campo` | `#ECEEF0` | amostrado | Fundo de campos (busca, entradas) |

### Verde (complemento)

A relação de produtos pede **laranja e verde**. O exemplo não tem verde na interface, só nas folhas das fotos, então o verde foi tirado dali e entra como cor secundária, nunca competindo com o laranja.

| Token | Hex | Uso |
|---|---|---|
| `--verde-700` | `#2F6B3A` | Texto/ícone de sucesso ("Nota salva"), selo "por quilo", botão secundário |
| `--verde-500` | `#5B7A24` | Segunda série em gráficos, ícones |
| `--verde-100` | `#DCEBD0` | Borda de selo verde |
| `--verde-50` | `#EEF5E8` | Fundo de selo/aviso positivo |
| `--verde-900` | `#1F4A2C` | Verde escuro de apoio (rodapé da nota impressa) |

### Regras de contraste

- Botão principal: fundo `--laranja-500` com texto `--tinta-900` (6,3:1). Texto branco sobre esse laranja **não** passa (2,7:1).
- Texto laranja pequeno sempre em `--laranja-700`.
- `--tinta-300` não é usado para texto que precisa ser lido; rótulos do menu inativo podem usá-lo porque o ícone carrega o sentido, mas prefira `--tinta-400` se for só texto.
- Estados de erro: `--erro` `#B42318` sobre `--erro-50` `#FDECEA`.

## 3. Tipografia

O exemplo usa uma sans geométrica pesada no título ("Restaurant Table Booking POS") e uma grotesca neutra na interface. Equivalentes no Google Fonts:

- **Títulos e números grandes:** Plus Jakarta Sans, 700–800.
- **Interface e texto:** Inter, 400–600, com `font-variant-numeric: tabular-nums` em preços, quantidades e totais.

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&display=swap" rel="stylesheet">
```

| Token | Tamanho | Peso | Uso |
|---|---|---|---|
| `--texto-3xl` | 48px | 800 | Título da tela de entrada (raro) |
| `--texto-2xl` | 32px | 800 | Total da nota, números do painel |
| `--texto-xl` | 24px | 700 | Nome da marca no topo, título de tela |
| `--texto-lg` | 18px | 600 | Título de cartão, subtotal |
| `--texto-md` | 15px | 400/500 | Base: nomes de produto, abas, campos |
| `--texto-sm` | 13px | 500 | Unidade, legendas, cabeçalho de tabela |
| `--texto-xs` | 11px | 500 | Rótulo sob ícone do menu lateral |

Preço no cartão segue o exemplo: nome em peso 400 e preço logo abaixo em peso 600–700, ambos centralizados.

## 4. Espaçamento, raios e sombras

- **Grade de 4px:** `--esp-1` (4) até `--esp-12` (48). Medidas do exemplo: distância entre cartões ≈ 20–22px (usar `--esp-5`), respiro interno do cartão ≈ 12–16px, topo com ≈ 72px de altura.
- **Raios:** `--raio-sm` 6px (abas, campos, botão do menu), `--raio-md` 8px (cartões), `--raio-lg` 16px (contêiner do app, painel da nota), `--raio-pill` para selos.
- **Sombras:** quase nenhuma. `--sombra-cartao` é um sopro; `--sombra-app` só no contêiner sobre o gradiente.
- **Alvo de toque mínimo:** 44px.

## 5. Padrões de layout

### Tela principal: nova nota (o "POS")

Mesma estrutura da tela "Restro POS", com a coluna da nota que aparece nos rascunhos do exemplo (Cart / Sub total / Grand Total / Proceed):

```
┌────────┬──────────────────────────────────────────┬───────────────────┐
│ Léo    │ Léo Frutas      [ Buscar produto…   🔍 ] │  Nota nº 0128     │
│ Frutas ├──────────────────────────────────────────┤  Cliente: [____]  │
│        │ [Frutas] [Verduras e legumes] [Todos]    │  ───────────────  │
│ ▣ Nova │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │  Maçã verde  1,2kg│
│   nota │ │ Maçã │ │ Uva  │ │Manga │ │Melan-│       │        R$ 26,40   │
│ ▢ Notas│ │verde │ │preta │ │ Tony │ │ cia  │       │  Melancia  1 peça │
│ ▢ Pre- │ │R$22  │ │R$20  │ │R$ 8  │ │R$22  │       │        R$ 22,00   │
│   ços  │ │ /kg  │ │ /kg  │ │ /kg  │ │/peça │       │  ───────────────  │
│ ▢ Pai- │ └──────┘ └──────┘ └──────┘ └──────┘       │  Total  R$ 48,40  │
│   nel  │ …                                        │  [ Gerar nota ]   │
└────────┴──────────────────────────────────────────┴───────────────────┘
  88px            fundo #F5F5F5, cartões brancos          380px, branco
```

- **Menu lateral** (88px, branco): ícone + rótulo de 11px, item ativo com fundo pêssego e contorno laranja. Itens: *Nova nota*, *Notas*, *Preços*, *Painel*. Não há *Clientes*.
- **Topo** (72px, branco): marca à esquerda, busca de produto ao centro.
- **Abas de categoria**: texto simples; a ativa ganha contorno `--laranja-300`, fundo `--laranja-100` e texto `--laranja-700`.
- **Grade de produtos**: `repeat(auto-fill, minmax(150px, 1fr))`, gap 20px. Sem fotos; o cartão mostra nome, preço e selo de unidade.
- **Coluna da nota** (380px): nome do cliente no topo (campo livre, não é cadastro), itens, total e botão principal.
- **Tablet em pé / celular:** a coluna da nota vira uma gaveta inferior fixa com o total e "Ver nota"; o menu lateral vira barra inferior.

### Gerenciar preços

Tabela em cartão branco sobre `--fundo-app`. Colunas: Produto · Categoria · Vende por (selo) · Preço · Atualizado em. Preço editável na própria linha; ao alterar, a linha ganha fundo `--laranja-100` até salvar, e um aviso verde "Preços salvos na planilha" confirma.

### Painel de números

Fileira de 3–4 indicadores (Vendas hoje, Notas hoje, Ticket médio, Mais vendido) em cartões brancos, número em `--texto-2xl` Plus Jakarta Sans. Abaixo, um gráfico de barras por dia (barras `--laranja-400`, comparação em `--verde-500`) e uma lista dos produtos mais vendidos. O topo do painel pode usar `--gradiente-marca`, ecoando a capa do exemplo.

### Nota impressa (A4)

Folha pensada para impressora comum, quase toda em preto; o laranja aparece só numa faixa fina do cabeçalho e no total.

```
┌──────────────────────────────────────────────────────┐
│ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ (faixa laranja 6px) ▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │
│ ╭──────╮ LÉO FRUTAS              NOTA DE PEDIDO Nº 0128│
│ │ LOGO │ Léo · (83) 99911-7487       16/10/2026 14:30 │
│ ╰──────╯ R. Pres. Raniere Mazilli, s/n, Box 24, CEASA │
│          João Pessoa/PB                               │
│                                                       │
│ Cliente: Mercadinho São José                          │
│                                                       │
│ Produto            Qtd     Un.    Preço un.     Total │
│ ───────────────────────────────────────────────────── │
│ Maçã verde         1,200   kg     R$ 22,00   R$ 26,40 │
│ Melancia           1       peça   R$ 22,00   R$ 22,00 │
│ Laranja pêra       20      un.    R$  0,50   R$ 10,00 │
│ Morango            2       caixa  R$ 60,00  R$ 120,00 │
│ ───────────────────────────────────────────────────── │
│                                   TOTAL    R$ 178,40  │
│                                                       │
│ Documento sem valor fiscal.                           │
└──────────────────────────────────────────────────────┘
```

- Página A4 (210 × 297 mm), margens de 15 mm, `@page { size: A4; margin: 15mm }`.
- **Logo** (`logo-leo-frutas.png`, recortada em círculo) no canto superior esquerdo, com cerca de 30 mm de diâmetro. Ao lado, em texto: LÉO FRUTAS, "Léo" e o telefone, e o endereço (o texto dentro da logo fica pequeno demais para ler impresso). O vendedor aparece só como "Léo".
- Fonte Inter 10–11pt no corpo, 18pt no nome da loja, 16pt no total.
- Números alinhados à direita e com `tabular-nums`; quantidade em kg sempre com 3 casas (1,200).
- Linhas da tabela com divisor fino `#D9D9D9`; sem fundos coloridos (economiza tinta).
- Rodapé obrigatório: **"Documento sem valor fiscal."**

## 6. Componentes

| Componente | Especificação |
|---|---|
| **Item do menu lateral** | 64×64px, raio 6px, ícone 22px de traço fino + rótulo 11px. Inativo: `--tinta-300`. Ativo: fundo `--laranja-100`, borda 1,5px `--laranja-500`, ícone e rótulo `--laranja-700`. |
| **Busca** | Altura 40px, fundo `--campo`, raio 6px, ícone de lupa à direita (como no exemplo), placeholder "Buscar produto…". |
| **Aba de categoria** | Altura 32px, padding 0 10px, raio 6px, texto 15px `--tinta-700`. Ativa: fundo `--laranja-100`, borda `--laranja-300`, texto `--laranja-700`. |
| **Cartão de produto** | Branco, raio 8px, padding 16px, texto centralizado. Nome 15px/400 (até 2 linhas), preço 17px/700 `--tinta-900`, selo de unidade abaixo. Tocar adiciona à nota; se já está na nota, mostra contador laranja no canto. |
| **Selo de unidade** | Pílula 22px, texto 12px/600. `kg` em verde (`--verde-50` / `--verde-700`); `peça`, `un.` e `caixa` em pêssego (`--laranja-100` / `--laranja-700`). |
| **Linha da nota** | Nome + quantidade/unidade à esquerda, total à direita em tabular. Controles −/+ (32px) para un./peça/caixa; campo de peso para kg. |
| **Campo de valor com ajuste manual** | Mostra o valor calculado (peso × preço do quilo). Ao digitar outro valor, aparece o selo "ajustado" em `--laranja-700` e um link "voltar ao calculado". Atende à regra da relação de produtos. |
| **Campo de texto** | Altura 44px, fundo `--branco`, borda 1px `--borda`, raio 6px; foco com borda `--laranja-500` e anel `0 0 0 3px --laranja-100`. |
| **Botão principal** | Altura 48px, fundo `--laranja-500`, texto `--tinta-900` 15px/700, raio 8px. Hover `--laranja-400`. Ex.: "Gerar nota", "Salvar preços". |
| **Botão secundário** | Fundo branco, borda `--borda`, texto `--tinta-700`. |
| **Botão de confirmação** | Fundo `--verde-700`, texto branco. Uso pontual: "Imprimir nota". |
| **Aviso (toast)** | Fundo `--tinta-900`, texto branco, ícone verde ou vermelho; some em 3s. Ex.: "Nota 0128 salva na planilha". |
| **Indicador do painel** | Cartão branco, rótulo 13px `--tinta-500`, número 32px/800 Plus Jakarta Sans, variação em verde ou vermelho. |

## 7. Ícones

Traço fino de 1,5px, cantos arredondados, 22px no menu e 18px nos botões, como os do exemplo (Home, Customers, Tables…). Lucide é a biblioteca mais próxima. Ícones sugeridos: `receipt` (Nova nota), `files` (Notas), `tag` (Preços), `bar-chart-3` (Painel), `search`, `printer`, `scale` (peso).

## 8. Tipos de venda (regra que o visual precisa mostrar)

| Tipo | Selo | Entrada na nota | Exemplos da relação |
|---|---|---|---|
| Quilo | `kg` verde | Peso com 3 casas, valor calculado e editável | Maçã, uvas, mangas, kiwi |
| Unidade | `un.` pêssego | Contador −/+ | Laranja pêra (R$ 0,50) |
| Peça | `peça` pêssego | Contador −/+ | Melancia (R$ 22,00) |
| Caixa | `caixa` pêssego | Contador −/+ | Morango (R$ 60,00) |

Verduras sem preço definido na relação aparecem no cartão como "definir preço" em `--tinta-400` até o valor ser cadastrado em *Preços*.
