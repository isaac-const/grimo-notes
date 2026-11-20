import { expect, type Page } from '@playwright/test';

export async function newFolder(page: Page, name: string, template = 'Jogo') {
  await page.getByRole('button', { name: /Nova pasta|Criar a primeira pasta/ }).first().click();
  await page.getByPlaceholder(/Ex\.: Jogos/).fill(name);
  await page.getByRole('dialog', { name: 'Nova pasta' }).getByText(template, { exact: true }).click();
  await page.getByRole('button', { name: 'Criar pasta' }).click();
  await expect(page.locator('h1')).toHaveText(name);
}

export async function newIdea(page: Page, title: string) {
  await page.locator('#newIdea').click();
  await page.getByLabel('Título', { exact: true }).fill(title);
  await page.getByRole('button', { name: 'Criar ideia' }).click();
  await expect(page.getByLabel('Título da ideia')).toHaveValue(title);
}
