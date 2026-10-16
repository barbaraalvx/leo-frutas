// Roda contra o build de produção servido pelo "Apps Script" local
// (scripts/servidor-local.ts): Code.js de verdade, google.script.run e a
// planilha em memória. Confere a ligação app ⇄ servidor antes da planilha real.

import { expect, test } from '@playwright/test';
import { abrirApp, cartao, total } from './ajudantes';

test.describe.configure({ mode: 'serial' });

test('nota ajustada chega na planilha e imprime pelo endereço do app', async ({ page, context, request }) => {
  await abrirApp(page);

  await cartao(page, 'Maçã verde').click();
  await expect(page.getByLabel('Peso de Maçã verde em kg')).toBeFocused();
  await page.keyboard.type('1,2');
  const valor = page.getByLabel('Valor de Maçã verde');
  await valor.fill('26,00');
  await valor.press('Enter');
  await cartao(page, 'Melancia').click();
  await page.getByLabel('Cliente').fill('Mercadinho São José');
  await expect(total(page)).toHaveText('R$ 48,00');

  await page.getByRole('button', { name: 'Gerar nota' }).click();
  await expect(page.getByText('Nota 0001 salva na planilha')).toBeVisible();

  // Critério de aceite: a planilha grava calculado 26,40, final 26,00, ajustado.
  const planilha = await (await request.get('/__planilha')).json();
  expect(planilha.Notas).toHaveLength(1);
  expect(planilha.Notas[0]).toMatchObject({ numero: 1, cliente: 'Mercadinho São José', total: 48, status: 'emitida' });
  expect(planilha.Itens[0]).toMatchObject({
    numero_nota: 1,
    produto_nome: 'Maçã verde',
    quantidade: 1.2,
    valor_calculado: 26.4,
    valor_final: 26,
    ajustado: true,
  });
  expect(planilha.Config.find((c: { chave: string }) => c.chave === 'proximo_numero').valor).toBe(2);

  // Imprimir usa o endereço que o doGet injetou.
  const [aba] = await Promise.all([context.waitForEvent('page'), page.getByRole('button', { name: 'Imprimir' }).click()]);
  await aba.waitForLoadState();
  expect(aba.url()).toBe('http://localhost:5175/?view=nota&numero=1');
  await expect(aba).toHaveTitle('Nota 0001 · Léo Frutas');
  const folha = aba.getByRole('article', { name: 'Nota de pedido 0001' });
  await expect(folha).toContainText('Cliente: Mercadinho São José');
  await expect(folha.locator('.folha__total')).toHaveText(/TOTAL\s*R\$ 48,00/);
});

test('erros do servidor chegam em português na tela', async ({ page }) => {
  await abrirApp(page);
  const mensagem = await page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        const run = window.google!.script!.run as unknown as Record<string, (...a: unknown[]) => void> & {
          withSuccessHandler(f: () => void): typeof run;
          withFailureHandler(f: (e: Error) => void): typeof run;
        };
        run
          .withSuccessHandler(() => resolve('não falhou'))
          .withFailureHandler((e) => resolve(e.message))
          .getNota(999);
      }),
  );
  expect(mensagem).toBe('Nota 999 não encontrada.');
});
