// Quem pode usar o app. O app roda "como quem acessa" (appsscript.json):
// cada pessoa entra com a própria conta Google e só consegue usar se a
// planilha estiver compartilhada com ela como editora. O compartilhamento
// da planilha é a lista de convidados.

export const MENSAGEM_SEM_ACESSO =
  'Sua conta não tem permissão na planilha da Léo Frutas. Peça a quem cuida dela para compartilhar com você como editor.';

/** Erros do Google quando a conta não pode ler ou editar a planilha. */
export function ehErroDePermissao(e: unknown): boolean {
  const mensagem = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
  return /permission|permissão|não tem acesso|access denied|acesso negado/i.test(mensagem);
}

/** Troca o erro de permissão do Google por uma mensagem que dá para entender no balcão. */
export function protegida<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
  return (...args) => {
    try {
      return fn(...args);
    } catch (e) {
      if (ehErroDePermissao(e)) throw new Error(MENSAGEM_SEM_ACESSO);
      throw e;
    }
  };
}

export function contaAtual(): string {
  try {
    return Session.getActiveUser().getEmail();
  } catch {
    return '';
  }
}

/** true se a conta de quem acessa consegue abrir a planilha. */
export function temAcesso(): boolean {
  try {
    SpreadsheetApp.getActiveSpreadsheet().getSheets();
    return true;
  } catch (e) {
    if (ehErroDePermissao(e)) return false;
    throw e;
  }
}

const escapar = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Página simples para quem abriu o link sem acesso (cores do design system). */
export function paginaSemAcesso(email: string): GoogleAppsScript.HTML.HtmlOutput {
  const conta = email
    ? `<p>Você entrou como <strong>${escapar(email)}</strong>.</p>`
    : '<p>Não deu para saber com qual conta Google você entrou.</p>';
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
         background: #F5F5F5; color: #414246; font: 15px/1.5 Inter, system-ui, sans-serif; }
  main { max-width: 420px; padding: 32px; border-radius: 16px; background: #FFFFFF;
         border-top: 6px solid #DD8845; }
  h1 { margin: 0 0 12px; color: #1B1A2A; font-size: 22px; }
  p { margin: 0 0 12px; }
  strong { color: #1B1A2A; }
</style></head>
<body><main>
  <h1>Sem acesso à Léo Frutas</h1>
  ${conta}
  <p>Esta conta não tem permissão na planilha da loja. Peça a quem cuida dela para compartilhar a planilha
  <strong>Léo Frutas · Sistema</strong> com você como <strong>editor</strong>, depois abra o link de novo.</p>
  <p>Se você tem outra conta Google com acesso, entre com ela.</p>
</main></body></html>`;
  return HtmlService.createHtmlOutput(html)
    .setTitle('Sem acesso · Léo Frutas')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}
