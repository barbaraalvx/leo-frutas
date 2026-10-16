# Como configurar o app da Léo Frutas em outros aparelhos

Guia para deixar o app de notas funcionando num tablet, celular ou computador novo. Leva uns 5 minutos por aparelho e só precisa ser feito uma vez.

> **Para o dia a dia no balcão**, use a folha de uma página `instrucoes/balcao.pdf` (gerada com `npm run instrucoes -- <link do app>`). Ela tem um QR code que abre o app direto.

---

## Antes de começar

Cada pessoa usa **a própria conta Google**. Ninguém precisa da senha de ninguém. Para alguém conseguir usar o app, três coisas precisam estar certas:

1. **A planilha "Léo Frutas · Sistema" está compartilhada com a conta dessa pessoa como Editor.** É o compartilhamento da planilha que decide quem pode usar o app.
2. **O aparelho está com essa conta Google** (no Chrome, no Safari ou nas configurações do aparelho).
3. **A pessoa tem o link do app**, ou a folha com o QR code.

O link do app termina em `/exec`. Hoje ele é o da **planilha de teste**:
`https://script.google.com/macros/s/AKfycbxo_pHSkPlZ6t2VDTrPYpBzP_FiUhrX4g7NyAYNA8bwxG-Pm2etIRGqnTOh-PJO6ik7/exec`

Quando o sistema passar para a planilha do Léo, o link muda (ver o fim deste guia). Use sempre o link novo.

---

## 1. Dar acesso a uma pessoa nova

Feito por quem já cuida da planilha:

1. Abra a planilha **Léo Frutas · Sistema** no Google Planilhas (no computador ou no app do celular).
2. Toque em **Compartilhar**.
3. Digite o e-mail Google da pessoa e escolha **Editor**.
4. Desmarque "Notificar pessoas" se não quiser mandar e-mail, e toque em **Enviar** ou **Compartilhar**.

> **Por que Editor e não Leitor?** O app grava as notas na planilha em nome de quem está usando. Com acesso de Leitor, a pessoa consegue ver os preços, mas não gerar notas.
>
> **Cuidado:** quem é Editor da planilha também consegue mexer no código do app, que fica dentro dela. Dê acesso só a quem é da família ou de confiança.

Para **tirar o acesso** de alguém: Compartilhar → toque no nome da pessoa → **Remover acesso**. A partir daí, o app mostra para ela "Sem acesso à Léo Frutas".

---

## 2. Tablet ou celular Android

1. **Confira a conta Google.** Em **Configurações › Contas** (ou **Senhas e contas**), veja se a conta da pessoa está lá. Se não estiver, toque em **Adicionar conta › Google** e entre.
2. **Abra o link do app no Chrome.** Aponte a câmera para o QR code da folha do balcão, ou mande o link por WhatsApp ou e-mail e toque nele.
3. **Se o Chrome perguntar qual conta usar**, escolha a que tem acesso à planilha.
4. **Na primeira vez, o Google pede autorização:**
   - aparece "O Google não verificou este app": toque em **Avançado** e depois em **Acessar Léo Frutas · Sistema (não seguro)**. O aviso aparece porque o app foi feito pela própria família, não por uma empresa. Pode seguir.
   - toque em **Permitir**.

   Isso é feito **uma vez por conta**, não por aparelho. Se a pessoa já autorizou no celular, o tablet não pergunta de novo.
5. **Crie o atalho:** no Chrome, toque nos **três pontinhos ⋮** (canto de cima, à direita) → **Adicionar à tela inicial** → **Adicionar**.
6. **Teste:** feche o Chrome e abra pelo ícone novo. Os produtos devem aparecer.

### Impressora no Android

O tablet imprime pelo serviço de impressão do Android:

1. Em **Configurações**, procure por **Impressão** (às vezes fica em **Dispositivos conectados › Preferências de conexão › Impressão**).
2. Ative o serviço da marca da impressora (HP, Epson, Canon, Brother…) ou o **Mopria Print Service**. Se não estiver lá, instale pela Play Store.
3. A impressora e o tablet precisam estar **na mesma rede Wi-Fi**.
4. Faça um teste: gere uma nota e toque em **Imprimir**. Na tela de impressão, escolha a impressora, papel **A4** e toque no botão de imprimir.

---

## 3. iPhone ou iPad

1. Abra o link no **Safari**. Pode ser pela câmera, apontando para o QR code.
2. Entre com a conta Google da pessoa quando o Google pedir.
3. Na primeira vez, faça a autorização como no Android (**Avançado** → **Acessar** → **Permitir**).
4. Crie o atalho: toque em **Compartilhar** (o quadrado com a seta para cima) → **Adicionar à Tela de Início** → **Adicionar**.
5. **Impressora:** o iPad imprime direto em impressoras com **AirPrint**, na mesma rede Wi-Fi. Na tela de impressão, escolha a impressora.

---

## 4. Computador (Windows ou Mac)

1. Abra o **Chrome** com a conta Google da pessoa. Se o Chrome tiver várias contas, use um **perfil** só para a loja: clique na foto no canto de cima → **Adicionar** → entre com a conta.
2. Abra o link do app e autorize na primeira vez, como acima.
3. Para ter um atalho: no Chrome, **⋮ › Transmitir, salvar e compartilhar › Criar atalho…** → marque **Abrir como janela** → **Criar**. Ou adicione o link aos favoritos.
4. A impressora do computador já funciona normalmente.

---

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| **"Sem acesso à Léo Frutas"** com o e-mail da conta | A planilha não está compartilhada com essa conta como Editor. Compartilhe (passo 1) ou entre com outra conta que tenha acesso. |
| **"Não foi possível abrir o arquivo neste momento"** (erro do Google) | Quase sempre é **mais de uma conta Google logada** no mesmo navegador. Deixe só a conta da loja nesse navegador, ou use um perfil do Chrome só para ela. |
| **"O Google não verificou este app"** | Normal na primeira vez. **Avançado** → **Acessar Léo Frutas · Sistema** → **Permitir**. |
| **Faixa escura "Planilha sem resposta"** | O app está usando os preços guardados no aparelho. Dá para montar a nota normalmente. Quando a internet melhorar, toque em **Tentar de novo**. |
| **Faixa escura "Sem internet"** | O aparelho perdeu a conexão. Monte a nota; ela fica na tela e é salva quando a internet voltar (**Tentar de novo**). Ela não sai repetida. |
| **O ícone do atalho é o do Google, não o da Léo Frutas** | Apague o atalho e crie de novo (passo 5). Se continuar, confira se a aba **Config** da planilha tem a linha `url_icone` preenchida. |
| **Não aparece a impressora** | Confira se o serviço de impressão está ativo e se a impressora e o aparelho estão no mesmo Wi-Fi. |
| **Os preços estão desatualizados** | Feche o app e abra de novo. Ele busca os preços da planilha toda vez que abre. |

---

## Para quem cuida do sistema (Bárbara)

- **Publicar uma versão nova:** no computador, na pasta do projeto, rode `npm run publicar`. O link não muda, e os aparelhos pegam a versão nova na próxima vez que abrirem o app.
- **Mudar para a planilha do Léo:** os passos estão no `CLAUDE.md`, seção "Pendente: mudar para a planilha do Léo". Depois da mudança:
  1. o link do app muda: atualize este guia e gere a folha de novo com `npm run instrucoes -- <link novo>`;
  2. em cada aparelho, apague o atalho antigo e refaça os passos acima com o link novo.
- **Primeira vez numa máquina nova (para publicar):** ative a "API do Google Apps Script" em https://script.google.com/home/usersettings e rode `npx clasp login`.
