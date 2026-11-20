import { expect, test } from '@playwright/test';
import { newFolder, newIdea } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('estado vazio ensina o primeiro passo', async ({ page }) => {
  await expect(page.locator('h1')).toContainText('Um caderno para o que ainda não existe');
  await expect(page.getByRole('button', { name: 'Criar a primeira pasta' })).toBeVisible();
});

test('cria pasta com modelo, ideia com tópicos prontos e edita', async ({ page }) => {
  await newFolder(page, 'Jogos', 'Jogo');
  await expect(page).toHaveURL(/#\/pasta\//);
  await expect(page.getByText('Essa pasta está vazia')).toBeVisible();
  await newIdea(page, 'Plano de estudo');
  const topics = await page.locator('input[aria-label="Nome do tópico"]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value));
  expect(topics).toEqual(['Premissa', 'Mecânica central', 'Arte e clima', 'Referências', 'Escopo', 'Riscos']);
  await page.getByRole('checkbox', { name: 'Concluir Premissa' }).click();
  await expect(page.getByText('1/6')).toBeVisible();
  await page.getByLabel('Novo tópico').fill('Trilha sonora');
  await page.getByRole('button', { name: 'Adicionar' }).click();
  await expect(page.locator('input[aria-label="Nome do tópico"]')).toHaveCount(7);
  await page.locator('.grimo-doc').click();
  await page.keyboard.type('Um jogo de masmorra aconchegante.');
  await expect(page.getByText('Salvo')).toBeVisible();
  await page.reload();
  await expect(page.locator('.grimo-doc')).toContainText('Um jogo de masmorra aconchegante.');
  await expect(page.getByRole('checkbox', { name: 'Concluir Premissa' })).toHaveAttribute('aria-checked', 'true');
});

test('status, prazo, fixar e categorias dão cor à fita', async ({ page }) => {
  await newFolder(page, 'Jogos');
  await newIdea(page, 'Ideia A');
  await page.getByLabel('Status').selectOption('progresso');
  await page.getByLabel('Prazo').fill('2026-12-24');
  await page.getByRole('button', { name: 'Fixar' }).click();
  await page.getByRole('button', { name: 'Terror' }).click();
  await expect(page.getByText('A primeira marcada (Terror) dá a cor da fita.')).toBeVisible();
  await page.getByRole('button', { name: /Jogos/ }).first().click();
  const card = page.locator('[data-idea]').first();
  await expect(card).toContainText('Em progresso');
  await expect(card).toContainText('vence em');
  const h = await card.evaluate((e) => (e as HTMLElement).style.getPropertyValue('--h'));
  expect(h).toBe('10');
});

test('modo cartões e lista persistem', async ({ page }) => {
  await newFolder(page, 'Jogos');
  await newIdea(page, 'Uma');
  await page.getByRole('button', { name: /Jogos/ }).first().click();
  await expect(page.locator('.row')).toHaveCount(0);
  await page.getByRole('button', { name: 'Lista' }).click();
  await expect(page.locator('.row')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.row')).toHaveCount(1);
});

test('captura rápida no início cria a ideia e abre', async ({ page }) => {
  await newFolder(page, 'Mods', 'Mod de Minecraft');
  await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
  await page.getByLabel('Título da nova ideia').fill('Espada de cristal');
  await page.getByLabel('Título da nova ideia').press('Enter');
  await expect(page.getByLabel('Título da ideia')).toHaveValue('Espada de cristal');
  await page.getByRole('button', { name: /Mods/ }).first().click();
  await expect(page.locator('[data-idea]')).toHaveCount(1);
});

test('apagar ideia e apagar pasta pedem confirmação', async ({ page }) => {
  await newFolder(page, 'Temp');
  await newIdea(page, 'Efêmera');
  await page.getByRole('button', { name: 'Apagar ideia' }).click();
  await page.locator('#confirmDelete').click();
  await expect(page.getByText('Essa pasta está vazia')).toBeVisible();
  await page.getByRole('button', { name: 'Editar pasta' }).click();
  await page.getByRole('button', { name: 'Apagar pasta' }).click();
  await page.locator('#confirmDelete').click();
  await expect(page.locator('h1')).toContainText('Um caderno');
});

test('seis temas, troca persiste e a barra lateral recolhe', async ({ page }) => {
  await page.getByRole('button', { name: 'Tema' }).click();
  const ids = await page.locator('[data-theme-id]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.themeId));
  expect(ids).toEqual(['dark', 'white', 'rose-black', 'rose-white', 'blue-dark', 'blue-white']);
  await page.locator('[data-theme-id="blue-dark"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blue-dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blue-dark');
  await page.getByRole('button', { name: 'Recolher barra lateral' }).click();
  await expect(page.getByRole('button', { name: 'Expandir barra lateral' })).toBeVisible();
  await page.waitForTimeout(500);
  const w = await page.locator('aside').evaluate((e) => e.getBoundingClientRect().width);
  expect(w).toBeLessThan(90);
});

test('captura de telas para conferência visual', async ({ page }) => {
  await newFolder(page, 'Jogos', 'Jogo');
  for (const t of ['Plano de estudo', 'Roteiro de viagem', 'Lista de compras']) {
    await newIdea(page, t);
    await page.getByRole('button', { name: /Jogos/ }).first().click();
  }
  await newFolder(page, 'Mods de Minecraft', 'Mod de Minecraft');
  await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'docs/prints/01-inicio.png' });
  await page.getByRole('button', { name: /^Jogos/ }).first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/prints/02-pasta.png' });
  await page.locator('[data-idea]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'docs/prints/03-ideia.png' });
});
