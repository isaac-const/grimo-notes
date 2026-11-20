import { expect, test } from '@playwright/test';
import { newFolder, newIdea } from './helpers';

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await newFolder(page, 'Jogos');
});

const backToFolder = (page: import('@playwright/test').Page) => page.getByRole('button', { name: /^Jogos/ }).first().click();

test('kanban: arrastar o cartão muda o status e persiste', async ({ page }) => {
  await newIdea(page, 'Mover');
  await backToFolder(page);
  await page.getByRole('button', { name: 'Kanban' }).click();
  await expect(page.locator('[data-col]')).toHaveCount(5);
  await expect(page.locator('[data-col="ideia"] [data-idea]')).toHaveCount(1);
  const card = page.locator('[data-col="ideia"] [data-idea]').first();
  const target = page.locator('[data-col="progresso"]');
  const [a, b] = [(await card.boundingBox())!, (await target.boundingBox())!];
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 20, a.y + a.height / 2 + 10, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + 120, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('[data-col="progresso"] [data-idea]')).toHaveCount(1);
  await expect(page.locator('[data-col="ideia"] [data-idea]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-col="progresso"] [data-idea]')).toHaveCount(1);
});

test('kanban: clicar no cartão abre a ideia', async ({ page }) => {
  await newIdea(page, 'Abrir');
  await backToFolder(page);
  await page.getByRole('button', { name: 'Kanban' }).click();
  await page.locator('[data-col] [data-idea]').first().click();
  await expect(page.getByLabel('Título da ideia')).toHaveValue('Abrir');
});

test('calendário: ideia com prazo aparece no dia, navega entre meses e conta as sem prazo', async ({ page }) => {
  await newIdea(page, 'Com prazo');
  await page.getByLabel('Prazo').fill(today());
  await backToFolder(page);
  await newIdea(page, 'Sem prazo');
  await backToFolder(page);
  await page.getByRole('button', { name: 'Calendário' }).click();
  await expect(page.locator(`[data-date="${today()}"] [data-idea]`)).toContainText('Com prazo');
  await expect(page.getByText('1 ideia sem prazo')).toBeVisible();
  const title = await page.getByRole('heading', { level: 2 }).first().textContent();
  await page.getByRole('button', { name: 'Próximo mês' }).click();
  expect(await page.getByRole('heading', { level: 2 }).first().textContent()).not.toBe(title);
  await page.getByRole('button', { name: 'Hoje' }).click();
  expect(await page.getByRole('heading', { level: 2 }).first().textContent()).toBe(title);
  await page.locator(`[data-date="${today()}"] [data-idea]`).click();
  await expect(page.getByLabel('Título da ideia')).toHaveValue('Com prazo');
});

test('início mostra o que vence na semana, atrasadas primeiro, e esconde as prontas', async ({ page }) => {
  await newIdea(page, 'Atrasada');
  await page.getByLabel('Prazo').fill(inDays(-2));
  await backToFolder(page);
  await newIdea(page, 'Amanhã');
  await page.getByLabel('Prazo').fill(inDays(1));
  await backToFolder(page);
  await newIdea(page, 'Longe');
  await page.getByLabel('Prazo').fill(inDays(30));
  await backToFolder(page);
  await newIdea(page, 'Pronta');
  await page.getByLabel('Prazo').fill(inDays(1));
  await page.getByLabel('Status').selectOption('pronta');
  await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
  const sec = page.locator('section[aria-labelledby="h-soon"]');
  await expect(sec.locator('[data-idea]')).toHaveCount(2);
  const titles = await sec.locator('h3').allTextContents();
  expect(titles).toEqual(['Atrasada', 'Amanhã']);
});

test('busca: por corpo, abre a ideia e cria a partir do texto', async ({ page }) => {
  await newIdea(page, 'Plano de estudo');
  await page.locator('.grimo-doc').click();
  await page.keyboard.type('masmorra com receitas');
  await expect(page.getByText('Salvo')).toBeVisible();
  await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
  await page.locator('#openPalette').click();
  await expect(page.getByRole('dialog', { name: 'Buscar' }).or(page.locator('[cmdk-root]'))).toBeVisible();
  await page.keyboard.type('masmorra');
  await expect(page.locator('[cmdk-item]').first()).toContainText('Plano de estudo');
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Título da ideia')).toHaveValue('Plano de estudo');
  await page.locator('#openPalette').click();
  await page.keyboard.type('Ideia nova pela paleta');
  await page.locator('[cmdk-item]', { hasText: 'Nova ideia' }).click();
  await expect(page.getByLabel('Título da ideia')).toHaveValue('Ideia nova pela paleta');
});

test('busca: fecha com Esc, troca o tema e vai para a galeria', async ({ page }) => {
  await page.locator('#openPalette').click();
  await expect(page.locator('[cmdk-root]')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[cmdk-root]')).toHaveCount(0);
  await page.locator('#openPalette').click();
  await page.locator('[cmdk-item]', { hasText: 'Azul escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blue-dark');
  await page.locator('#openPalette').click();
  await page.keyboard.type('galeria');
  await page.keyboard.press('Enter');
  await expect(page.locator('h1')).toHaveText('Galeria');
});

test('galeria: junta as imagens de todas as ideias, filtra por pasta e abre a ideia', async ({ page }) => {
  await page.getByRole('button', { name: 'Galeria' }).click();
  await expect(page.getByText('Nada por aqui ainda')).toBeVisible();
  await backToFolder(page);
  await newIdea(page, 'Com imagem');
  await page.locator('.grimo-doc').click();
  await page.locator('#grimo-pick-image').setInputFiles('public/logo.svg');
  await expect(page.locator('.img-node')).toHaveCount(1);
  await page.getByLabel('Legenda da imagem').fill('Logo do app');
  await expect(page.getByText('Salvo')).toBeVisible();
  await newFolder(page, 'Outra pasta');
  await page.getByRole('button', { name: 'Galeria' }).click();
  await expect(page.locator('[data-gallery-item]')).toHaveCount(1);
  await page.locator('main select').selectOption({ label: 'Outra pasta' });
  await expect(page.locator('[data-gallery-item]')).toHaveCount(0);
  await page.locator('main select').selectOption({ label: 'Todas' });
  await page.locator('[data-gallery-item]').click();
  await expect(page.getByLabel('Título da ideia')).toHaveValue('Com imagem');
});

test('capturas de tela da fase 3', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('grimo-theme', 'rose-black'));
  await page.reload();
  const items: [string, string, string, string?][] = [
    ['Plano de estudo', 'ideia', inDays(3)],
    ['Roteiro de viagem', 'explorando', inDays(9)],
    ['Lista de compras', 'progresso', inDays(1)],
    ['Orçamento da casa', 'progresso', inDays(-1)],
    ['Revisão da prova', 'pronta', inDays(5)],
  ];
  for (const [t, st, due] of items) {
    await newIdea(page, t);
    await page.getByLabel('Status').selectOption(st);
    await page.getByLabel('Prazo').fill(due);
    if (t.startsWith('Plano')) await page.getByRole('button', { name: 'Terror' }).click();
    if (t.startsWith('Platformer')) await page.getByRole('button', { name: 'Aventura' }).click();
    if (t.startsWith('Bullet')) await page.getByRole('button', { name: 'Puzzle' }).click();
    await backToFolder(page);
  }
  await page.getByRole('button', { name: 'Kanban' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/prints/05-kanban.png' });
  await page.getByRole('button', { name: 'Calendário' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/prints/06-calendario.png' });
  await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
  await page.locator('#openPalette').click();
  await page.keyboard.type('cozy');
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/prints/07-paleta.png' });
});

test('galeria: desenhos também aparecem, e um bloco vazio não conta', async ({ page }) => {
  await newIdea(page, 'Com desenho');
  await page.locator('.grimo-doc').click();
  await page.keyboard.type('/desenho');
  await page.keyboard.press('Enter');
  await page.getByRole('button', { name: 'Galeria' }).click();
  await expect(page.getByText('Nada por aqui ainda')).toBeVisible();
  await backToFolder(page);
  await page.locator('[data-idea]').first().click();
  const b = (await page.locator('.drawing-canvas').boundingBox())!;
  await page.mouse.move(b.x + 80, b.y + 80);
  await page.mouse.down();
  await page.mouse.move(b.x + 200, b.y + 120, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText('Salvo')).toBeVisible();
  await page.getByRole('button', { name: 'Galeria' }).click();
  await expect(page.locator('[data-gallery-item] svg path')).toHaveCount(1);
});
