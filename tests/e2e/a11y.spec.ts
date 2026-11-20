import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { newFolder, newIdea } from './helpers';

const THEMES = ['dark', 'white', 'rose-black', 'rose-white', 'blue-dark', 'blue-white'];
const axe = async (page: Page, label: string) => {
  await page.waitForTimeout(350); // espera as transições de entrada terminarem
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return r.violations.map((v) => `${label} ${v.id}: ${v.nodes.length}x ${v.nodes[0]?.target?.join(' ')} | ${v.nodes[0]?.failureSummary?.split('\n')[1] ?? ''}`);
};

for (const theme of THEMES) {
  test(`telas principais no tema ${theme}`, async ({ page }) => {
    await page.addInitScript((t) => { if (!localStorage.getItem('grimo-theme')) localStorage.setItem('grimo-theme', t); }, theme);
    await page.goto('/');
    await page.evaluate((t) => { localStorage.clear(); localStorage.setItem('grimo-theme', t); }, theme);
    await page.reload();
    const out: string[] = [];
    out.push(...(await axe(page, 'vazio')));
    await newFolder(page, 'Jogos');
    out.push(...(await axe(page, 'pasta vazia')));
    await newIdea(page, 'Ideia de teste');
    await page.getByLabel('Prazo').fill('2026-12-24');
    await page.getByRole('button', { name: 'Terror' }).click();
    await page.locator('.grimo-doc').click();
    await page.keyboard.type('Algum texto de teste');
    await page.waitForTimeout(700);
    out.push(...(await axe(page, 'ideia')));
    await page.getByRole('button', { name: /^Jogos/ }).first().click();
    await page.waitForTimeout(300);
    out.push(...(await axe(page, 'cartões')));
    for (const v of ['Lista', 'Kanban', 'Calendário']) {
      await page.getByRole('button', { name: v }).click();
      await page.waitForTimeout(250);
      out.push(...(await axe(page, v)));
    }
    await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
    await page.waitForTimeout(300);
    out.push(...(await axe(page, 'início')));
    await page.getByRole('button', { name: 'Configurações' }).click();
    out.push(...(await axe(page, 'configurações')));
    await page.locator('#openPalette').click();
    await page.waitForTimeout(250);
    out.push(...(await axe(page, 'paleta')));
    expect(out).toEqual([]);
  });
}
