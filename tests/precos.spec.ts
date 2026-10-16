import { expect, test, type Page } from '@playwright/test';
import { cartao } from './ajudantes';

async function abrirPrecos(page: Page) {
  await page.goto('/');
  await expect(cartao(page, 'Maçã verde')).toBeVisible();
  await page.getByRole('button', { name: 'Preços' }).click();
  await expect(page.getByRole('heading', { name: 'Preços' })).toBeVisible();
}

const linha = (page: Page, nome: string) =>
  page.locator('.tabela-precos tbody tr').filter({ has: page.getByRole('button', { name: `Editar ${nome}`, exact: true }) });

const salvar = (page: Page) => page.getByRole('button', { name: /^Salvar preços/ });

test.beforeEach(async ({ page }) => abrirPrecos(page));

test('muda o preço, salva e o cartão da Nova nota acompanha', async ({ page }) => {
  await expect(salvar(page)).toBeDisabled();
  const preco = page.getByLabel('Preço de Maçã', { exact: true });
  await preco.fill('18,5');
  await preco.press('Enter');

  await expect(preco).toHaveValue('18,50');
  await expect(linha(page, 'Maçã')).toHaveClass(/tabela-precos__alterada/);
  await expect(linha(page, 'Maçã')).toContainText('não salvo');
  await expect(salvar(page)).toHaveText('Salvar preços (1)');

  await salvar(page).click();
  await expect(page.getByText('Preços salvos na planilha')).toBeVisible();
  await expect(linha(page, 'Maçã')).not.toHaveClass(/tabela-precos__alterada/);
  await expect(linha(page, 'Maçã')).toContainText(/\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}/);

  await page.getByRole('button', { name: 'Nova nota' }).click();
  await expect(cartao(page, 'Maçã')).toContainText('R$ 18,50');
});

test('voltar o preço ao original deixa de ser alteração', async ({ page }) => {
  const preco = page.getByLabel('Preço de Melancia');
  await preco.fill('25');
  await preco.press('Enter');
  await expect(salvar(page)).toBeEnabled();
  await preco.fill('22,00');
  await preco.press('Enter');
  await expect(salvar(page)).toBeDisabled();
});

test('desativar tira o produto da Nova nota', async ({ page }) => {
  await page.getByRole('switch', { name: 'Kiwi ativo' }).click();
  await expect(page.getByRole('switch', { name: 'Kiwi ativo' })).toHaveAttribute('aria-checked', 'false');
  await salvar(page).click();
  await expect(page.getByText('Preços salvos na planilha')).toBeVisible();

  await page.getByRole('button', { name: 'Nova nota' }).click();
  await expect(cartao(page, 'Manga Tommy')).toBeVisible();
  await expect(cartao(page, 'Kiwi')).toHaveCount(0);
});

test('novo produto sem preço aparece como "definir preço"', async ({ page }) => {
  await page.getByRole('button', { name: 'Novo produto' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Novo produto' });
  await expect(dialogo.getByLabel('Nome')).toBeFocused();

  // Sem nome não salva.
  await dialogo.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(dialogo.getByText('Digite o nome do produto.')).toBeVisible();

  await dialogo.getByLabel('Nome').fill('Pêssego');
  await dialogo.getByRole('radio', { name: 'Frutas', exact: true }).check();
  await dialogo.getByRole('radio', { name: 'quilo (kg)' }).check();
  await dialogo.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(page.getByText('Salvando…')).toBeVisible();
  await expect(page.getByText('Pêssego cadastrado')).toBeVisible();
  await expect(dialogo).toBeHidden();
  await expect(linha(page, 'Pêssego')).toBeVisible();

  await page.getByRole('button', { name: 'Nova nota' }).click();
  await expect(cartao(page, 'Pêssego')).toContainText('definir preço');
});

test('editar nome, tipo e preço pelo formulário', async ({ page }) => {
  await page.getByRole('button', { name: 'Editar Alface' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Editar produto' });
  await expect(dialogo.getByLabel('Nome')).toHaveValue('Alface');
  await dialogo.getByLabel('Nome').fill('Alface crespa');
  await dialogo.getByRole('radio', { name: 'peça', exact: true }).check();
  await dialogo.getByLabel(/Preço por/).fill('3');
  await dialogo.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(page.getByText('Produto salvo na planilha')).toBeVisible();

  const nova = linha(page, 'Alface crespa');
  await expect(nova).toContainText('peça');
  await expect(page.getByLabel('Preço de Alface crespa')).toHaveValue('3,00');
});

test('preço inválido no formulário mostra erro', async ({ page }) => {
  await page.getByRole('button', { name: 'Novo produto' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Novo produto' });
  await dialogo.getByLabel('Nome').fill('Teste');
  await dialogo.getByLabel(/Preço por/).fill('abc');
  await dialogo.getByRole('button', { name: 'Salvar produto' }).click();
  await expect(dialogo.getByRole('alert')).toContainText('Preço inválido');
  await page.keyboard.press('Escape');
  await expect(dialogo).toBeHidden();
});

/** Arrasta a alça de um produto até o meio de outra linha, em passos (como um dedo). */
async function arrastar(page: Page, deNome: string, ateNome: string) {
  const alca = page.getByRole('button', { name: new RegExp(`^Mover ${deNome}\\.`) });
  const origem = (await alca.boundingBox())!;
  const destino = (await linha(page, ateNome).boundingBox())!;
  await page.mouse.move(origem.x + origem.width / 2, origem.y + origem.height / 2);
  await page.mouse.down();
  await page.mouse.move(origem.x + origem.width / 2, destino.y + destino.height / 2 - 4, { steps: 12 });
  await page.waitForTimeout(100);
  await page.mouse.up();
}

const primeiraLinha = (page: Page) => page.locator('.tabela-precos tbody tr').first();

test('arrastar e soltar muda a ordem na grade da Nova nota', async ({ page }) => {
  await page.getByRole('tab', { name: 'Frutas' }).click();
  await arrastar(page, 'Melão', 'Laranja pêra');
  await expect(primeiraLinha(page)).toContainText('Melão');
  // Melão era o 9º: ele e os 8 de cima mudam de posição.
  await expect(salvar(page)).toHaveText('Salvar preços (9)');
  await salvar(page).click();
  await expect(page.getByText('Preços salvos na planilha')).toBeVisible();

  await page.getByRole('button', { name: 'Nova nota' }).click();
  await expect(page.locator('.cartao-produto').first()).toContainText('Melão');
  await expect(page.locator('.cartao-produto').nth(1)).toContainText('Laranja pêra');
});

test.describe('tela baixa', () => {
  test.use({ viewport: { width: 1280, height: 520 } });

  test('a lista rola sozinha para levar um produto do fim ao começo', async ({ page }) => {
    await page.getByRole('tab', { name: 'Frutas' }).click();
    const alca = page.getByRole('button', { name: /^Mover Ameixa\./ });
    await alca.scrollIntoViewIfNeeded();
    const origem = (await alca.boundingBox())!;
    await page.mouse.move(origem.x + origem.width / 2, origem.y + origem.height / 2);
    await page.mouse.down();
    // Segura perto da borda de cima até a lista chegar ao começo.
    await page.mouse.move(origem.x + origem.width / 2, 40, { steps: 10 });
    await expect.poll(() => page.evaluate(() => document.querySelector('.conteudo')!.scrollTop)).toBe(0);
    // As linhas abriram espaço (estão deslocadas); o cabeçalho da tabela não se mexe.
    const cabecalho = (await page.locator('.tabela-precos thead').boundingBox())!;
    await page.mouse.move(origem.x + origem.width / 2, cabecalho.y + cabecalho.height + 4, { steps: 6 });
    await page.waitForTimeout(100);
    await page.mouse.up();
    await expect(primeiraLinha(page)).toContainText('Ameixa');
  });
});

test('pelo teclado: setas na alça movem o produto', async ({ page }) => {
  const alca = page.getByRole('button', { name: /^Mover Maçã\./ });
  await alca.focus();
  await page.keyboard.press('ArrowUp');
  await expect(primeiraLinha(page)).toContainText('Maçã');
  await expect(salvar(page)).toHaveText('Salvar preços (2)');
  // O foco segue o produto: mais um ↓ devolve ao lugar e não sobra alteração.
  await page.keyboard.press('ArrowDown');
  await expect(salvar(page)).toBeDisabled();
});

test('não há mais setas de subir e descer', async ({ page }) => {
  await expect(page.getByRole('button', { name: /^(Subir|Descer) / })).toHaveCount(0);
});

test('sair com alteração não salva pede confirmação', async ({ page }) => {
  const preco = page.getByLabel('Preço de Melancia');
  await preco.fill('30');
  await preco.press('Enter');

  await page.getByRole('button', { name: 'Nova nota' }).click();
  const dialogo = page.getByRole('dialog', { name: 'Sair sem salvar?' });
  await expect(dialogo).toContainText('Um produto tem alteração');
  await dialogo.getByRole('button', { name: 'Continuar editando' }).click();
  await expect(page.getByLabel('Preço de Melancia')).toHaveValue('30,00');

  await page.getByRole('button', { name: 'Nova nota' }).click();
  await page.getByRole('button', { name: 'Sair sem salvar' }).click();
  await expect(cartao(page, 'Melancia')).toContainText('R$ 22,00');
});

test('busca e filtro por categoria mostram inativos também', async ({ page }) => {
  await page.getByRole('tab', { name: 'Verduras e legumes' }).click();
  await expect(page.locator('.tabela-precos tbody tr')).toHaveCount(9);
  await page.getByPlaceholder('Buscar produto…').fill('uva');
  await expect(page.locator('.tabela-precos tbody tr')).toHaveCount(3);
});

test.describe('celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('tabela vira cartões, sem rolagem lateral', async ({ page }) => {
    await expect(page.getByLabel('Preço de Maçã', { exact: true })).toBeVisible();
    const largura = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(largura).toBeLessThanOrEqual(390);
  });
});
