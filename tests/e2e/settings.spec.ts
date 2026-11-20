import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { newFolder, newIdea } from './helpers';

const go = async (page: Page) => {
  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.locator('h1')).toHaveText('Configurações');
};

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('abre pela barra lateral e tem os cinco grupos de opções', async ({ page }) => {
  await go(page);
  for (const h of ['Aparência', 'Editor', 'Pastas e ideias', 'Categorias', 'Dados', 'Sobre']) await expect(page.getByRole('heading', { level: 2, name: h })).toBeVisible();
  await expect(page).toHaveURL(/#\/configuracoes$/);
});

test('tema muda na hora e persiste', async ({ page }) => {
  await go(page);
  await page.getByRole('radio', { name: 'Azul escuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blue-dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'blue-dark');
  await expect(page.getByRole('radio', { name: 'Azul escuro' })).toHaveAttribute('aria-checked', 'true');
});

test('tamanho, largura e fonte do texto mudam o editor e persistem', async ({ page }) => {
  await page.setViewportSize({ width: 1900, height: 900 }); // com janela estreita o conteúdo já ocupa tudo e a largura não faz diferença
  await newFolder(page, 'Notas');
  await newIdea(page, 'Texto');
  const css = async () => (await page.locator('.grimo-doc').waitFor(), page.evaluate(() => ({ size: getComputedStyle(document.querySelector('.grimo-doc')!).fontSize, font: getComputedStyle(document.querySelector('.grimo-doc')!).fontFamily, art: Math.round(document.querySelector('.grimo-doc')!.getBoundingClientRect().width) })));
  const base = await css();
  expect(base.size).toBe('17px');
  await go(page);
  await page.getByRole('radio', { name: 'Grande' }).click();
  await page.getByRole('radio', { name: 'Larga' }).click();
  await page.getByRole('radio', { name: 'Geist Mono' }).click();
  await page.getByRole('button', { name: 'Notas' }).first().click();
  await page.locator('[data-idea]').first().click();
  const now = await css();
  expect(now.size).toBe('19px');
  expect(now.font).toContain('Geist Mono');
  expect(now.art).toBeGreaterThan(base.art);
  await page.reload();
  expect((await css()).size).toBe('19px');
});

test('reduzir animações liga a marca no html e persiste', async ({ page }) => {
  await go(page);
  await page.getByRole('switch', { name: 'Reduzir animações' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-reduce-motion', 'true');
});

test('visão padrão das pastas e propriedades escondidas por padrão', async ({ page }) => {
  await newFolder(page, 'Notas');
  await newIdea(page, 'Uma');
  await go(page);
  await page.getByRole('radio', { name: 'Lista' }).click();
  await page.getByRole('switch', { name: 'Mostrar as propriedades ao abrir uma ideia' }).click();
  await page.getByRole('button', { name: /^Notas/ }).first().click();
  await expect(page.locator('.row')).toHaveCount(1);
  await page.locator('.row').first().click();
  await expect(page.getByRole('complementary', { name: 'Propriedades' })).toHaveCount(0);
});

test('sem confirmação ao apagar, a ideia some direto', async ({ page }) => {
  await newFolder(page, 'Notas');
  await newIdea(page, 'Efêmera');
  await go(page);
  await page.getByRole('switch', { name: 'Pedir confirmação ao apagar' }).click();
  await page.getByRole('button', { name: /^Notas/ }).first().click();
  await page.locator('[data-idea]').first().click();
  await page.getByRole('button', { name: 'Apagar ideia' }).click();
  await expect(page.getByText('Essa pasta está vazia')).toBeVisible();
  await expect(page.locator('#confirmDelete')).toHaveCount(0);
});

test('categorias: criar, renomear, mudar a cor, aparecer na ideia e apagar', async ({ page }) => {
  await newFolder(page, 'Notas');
  await newIdea(page, 'Com categoria');
  await go(page);
  await page.getByLabel('Nome da nova categoria').fill('Receita');
  await page.getByLabel('Grupo da nova categoria').fill('Área');
  await page.getByRole('button', { name: 'Adicionar categoria' }).click();
  await expect(page.getByLabel('Nome da categoria Receita')).toBeVisible();
  const n = page.getByLabel('Nome da categoria Receita');
  await n.fill('Culinária');
  await n.press('Tab');
  await expect(page.getByLabel('Nome da categoria Culinária')).toBeVisible();
  await page.getByRole('button', { name: 'Cor de Culinária' }).click();
  await page.getByRole('button', { name: 'Matiz 150' }).click();
  await expect(page.getByRole('button', { name: 'Matiz 150' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /^Notas/ }).first().click();
  await page.locator('[data-idea]').first().click();
  await expect(page.getByRole('button', { name: 'Culinária' })).toBeVisible();
  await page.getByRole('button', { name: 'Culinária' }).click();
  await go(page);
  await page.getByRole('button', { name: 'Apagar categoria Culinária' }).click();
  await expect(page.getByLabel('Nome da categoria Culinária')).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel('Nome da categoria Culinária')).toHaveCount(0);
});

test('apagar todas as categorias não as traz de volta ao recarregar', async ({ page }) => {
  await go(page);
  for (const c of await page.locator('input[aria-label^="Nome da categoria "]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))) await page.getByRole('button', { name: `Apagar categoria ${c}` }).click();
  await expect(page.locator('input[aria-label^="Nome da categoria "]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('input[aria-label^="Nome da categoria "]')).toHaveCount(0);
});

test('exportar backup e Markdown baixa os arquivos certos', async ({ page }) => {
  await newFolder(page, 'Receitas');
  await newIdea(page, 'Pão caseiro');
  await page.locator('.grimo-doc').click();
  await page.keyboard.type('Farinha, água e sal.');
  await expect(page.getByText('Salvo')).toBeVisible();
  await go(page);
  const [dj] = await Promise.all([page.waitForEvent('download'), page.locator('#exportJson').click()]);
  expect(dj.suggestedFilename()).toMatch(/^grimo-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const snap = JSON.parse(readFileSync((await dj.path())!, 'utf8'));
  expect(snap).toMatchObject({ app: 'grimo-notes', version: 1 });
  expect(snap.folders[0].name).toBe('Receitas');
  expect(snap.ideas[0].title).toBe('Pão caseiro');
  await expect(page.getByRole('status')).toContainText('Backup salvo');
  const [dm] = await Promise.all([page.waitForEvent('download'), page.locator('#exportMd').click()]);
  expect(dm.suggestedFilename()).toMatch(/\.md$/);
  const md = readFileSync((await dm.path())!, 'utf8');
  expect(md).toContain('## Receitas');
  expect(md).toContain('### Pão caseiro');
  expect(md).toContain('Farinha, água e sal.');
});

test('importar um backup recria pastas e ideias; arquivo errado mostra o motivo', async ({ page }) => {
  await newFolder(page, 'Receitas');
  await newIdea(page, 'Pão caseiro');
  await go(page);
  const [d] = await Promise.all([page.waitForEvent('download'), page.locator('#exportJson').click()]);
  const path = (await d.path())!;
  await page.locator('#wipe').click();
  await page.locator('#confirmWipe').click();
  await expect(page.getByRole('status')).toContainText('Tudo foi apagado');
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#importJson').click()]);
  await fc.setFiles(path);
  await expect(page.getByRole('status')).toContainText('Importado: 1 pasta e 1 ideia');
  await page.getByRole('button', { name: /^Receitas/ }).first().click();
  await expect(page.locator('[data-idea]')).toContainText('Pão caseiro');
  await go(page);
  const [bad] = await Promise.all([page.waitForEvent('filechooser'), page.locator('#importJson').click()]);
  await bad.setFiles({ name: 'x.json', mimeType: 'application/json', buffer: Buffer.from('{"a":1}') });
  await expect(page.getByRole('status')).toContainText('não é um backup do Grimo Notes');
});

test('dados de exemplo: carregar e apagar só o que veio deles', async ({ page }) => {
  await newFolder(page, 'Minha pasta');
  await go(page);
  await page.locator('#loadExample').click();
  await expect(page.getByRole('status')).toContainText('Exemplos carregados');
  await expect(page.locator('#removeExample')).toBeVisible();
  await page.locator('#removeExample').click();
  await expect(page.getByRole('status')).toContainText('Exemplos apagados');
  await expect(page.locator('aside nav')).toContainText('Minha pasta');
  await expect(page.locator('aside nav')).not.toContainText('Estudos');
});

test('apagar tudo pede uma segunda confirmação', async ({ page }) => {
  await newFolder(page, 'Temp');
  await go(page);
  await page.locator('#wipe').click();
  await expect(page.getByText('Tem certeza?')).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar' }).click();
  await expect(page.locator('aside nav')).toContainText('Temp');
  await page.locator('#wipe').click();
  await page.locator('#confirmWipe').click();
  await expect(page.locator('aside nav')).not.toContainText('Temp');
});
