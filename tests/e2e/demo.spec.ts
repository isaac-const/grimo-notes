import { expect, test, type Page } from '@playwright/test';

const P = (n: string) => `docs/prints/${n}.png`;
const folder = (page: Page, name: string) => page.locator('aside nav').getByRole('button', { name: new RegExp(`^${name}`) }).click();
const idea = (page: Page, title: string) => page.locator('[data-idea]', { hasText: title }).first().click();
const settle = (page: Page, ms = 500) => page.waitForTimeout(ms);
const scrollTo = async (page: Page, sel: string, offset = 90) => {
  await page.locator(sel).first().evaluate((el, off) => {
    const main = document.getElementById('main')!;
    main.scrollTop += el.getBoundingClientRect().top - main.getBoundingClientRect().top - off;
  }, offset);
  await settle(page, 400);
};

test.describe.configure({ mode: 'serial' });

test('caso de uso completo com dados de exemplo e prints de cada função', async ({ page }) => {
  test.setTimeout(180_000);
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto('/');
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('grimo-theme', 'dark'); });
  await page.reload();

  // primeiro uso
  await page.screenshot({ path: P('00-primeiro-uso') });

  // categorias de partida são de jogos: tirar as que não servem para este exemplo, como qualquer pessoa faria
  await page.getByRole('button', { name: 'Configurações' }).click();
  await expect(page.locator('h1')).toHaveText('Configurações');
  for (const c of await page.locator('input[aria-label^="Nome da categoria "]').evaluateAll((els) => els.map((e) => (e as HTMLInputElement).value))) await page.getByRole('button', { name: `Apagar categoria ${c}` }).click();
  await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
  await page.locator('#loadExample').click();
  await expect(page.locator('h1')).toHaveText('Suas ideias');
  await expect(page.getByRole('status')).toContainText('Dados de exemplo');
  await settle(page, 800);
  await page.screenshot({ path: P('01-inicio') });

  // pasta em cartões e em lista
  await folder(page, 'Estudos');
  await settle(page);
  await page.screenshot({ path: P('02-pasta-cartoes') });
  await page.getByRole('button', { name: 'Lista' }).click();
  await settle(page, 300);
  await page.screenshot({ path: P('03-pasta-lista') });
  await page.getByRole('button', { name: 'Cartões' }).click();

  // ideia: texto em primeiro plano e painel lateral
  await idea(page, 'Anotações de banco de dados');
  await page.setViewportSize({ width: 1360, height: 980 });
  await settle(page, 900);
  await page.screenshot({ path: P('04-ideia-com-painel') });

  // tabela, código, destaque e lista recolhível
  await scrollTo(page, '.grimo-doc table', 120);
  await page.screenshot({ path: P('05-tabela-e-codigo') });
  await scrollTo(page, '.grimo-doc [data-callout]', 160);
  await page.locator('.grimo-doc [data-type="details"] > button').click();
  await settle(page, 300);
  await page.screenshot({ path: P('06-destaque-e-recolhivel') });

  // menu de seleção: texto, cor, tamanho
  await scrollTo(page, '.grimo-doc p', 300);
  await page.locator('.grimo-doc p').first().click({ clickCount: 3 });
  await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
  await settle(page, 300);
  await page.screenshot({ path: P('07-selecao-barra') });
  await page.getByRole('button', { name: 'Cor do texto e do fundo' }).click();
  await settle(page, 250);
  await page.screenshot({ path: P('08-selecao-cores') });
  await page.keyboard.press('Escape');

  // alça do bloco
  await page.keyboard.press('ArrowRight'); // recolhe a seleção para a barra sumir
  await page.locator('.grimo-doc p').first().hover();
  await settle(page, 400);
  await page.getByRole('button', { name: /Arrastar ou abrir menu/ }).click();
  await settle(page, 250);
  await page.screenshot({ path: P('09-alca-do-bloco') });
  await page.keyboard.press('Escape');

  // menu / com grupos
  await page.locator('.grimo-doc').last().click();
  await page.keyboard.press('Control+End');
  await page.keyboard.type('/');
  await settle(page, 300);
  await page.screenshot({ path: P('10-menu-barra') });
  await page.keyboard.press('Escape');
  await page.keyboard.press('Backspace');

  // desenho com um traço feito na hora
  await folder(page, 'Viagens');
  await idea(page, 'Roteiro de cinco dias');
  await settle(page, 700);
  await scrollTo(page, '.grimo-doc .drawing', 120);
  await page.getByRole('button', { name: 'Editar desenho' }).click();
  const c = (await page.locator('.drawing-canvas').boundingBox())!;
  await page.getByRole('button', { name: 'Cor 5' }).click();
  await page.mouse.move(c.x + c.width * 0.08, c.y + c.height * 0.9);
  await page.mouse.down();
  await page.mouse.move(c.x + c.width * 0.3, c.y + c.height * 0.82, { steps: 10 });
  await page.mouse.move(c.x + c.width * 0.55, c.y + c.height * 0.92, { steps: 10 });
  await page.mouse.move(c.x + c.width * 0.85, c.y + c.height * 0.8, { steps: 10 });
  await page.mouse.up();
  await settle(page, 300);
  await page.screenshot({ path: P('11-desenho') });
  await page.getByRole('button', { name: 'Pronto' }).click();

  // kanban, com um arraste de verdade
  await folder(page, 'Estudos');
  await page.getByRole('button', { name: 'Kanban' }).click();
  await settle(page, 500);
  await page.screenshot({ path: P('12-kanban') });
  const card = page.locator('[data-col="ideia"] [data-idea]', { hasText: 'Plano de leitura' });
  const a = (await card.boundingBox())!;
  const b = (await page.locator('[data-col="explorando"]').boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 40, a.y + 30, { steps: 4 });
  await page.mouse.move(b.x + b.width / 2, b.y + 160, { steps: 10 });
  await settle(page, 150);
  await page.screenshot({ path: P('13-kanban-arrastando') });
  await page.mouse.up();
  await expect(page.locator('[data-col="explorando"] [data-idea]', { hasText: 'Plano de leitura' })).toHaveCount(1);

  // calendário e galeria (só desenhos)
  await page.getByRole('button', { name: 'Calendário' }).click();
  await settle(page, 500);
  await page.screenshot({ path: P('14-calendario') });
  await page.getByRole('button', { name: 'Galeria' }).click();
  await settle(page, 900);
  await page.screenshot({ path: P('15-galeria-de-desenhos') });

  // busca
  await page.locator('#openPalette').click();
  await page.keyboard.type('banco');
  await settle(page, 400);
  await page.screenshot({ path: P('16-busca') });
  await page.keyboard.press('Escape');

  // nova pasta com modelos
  await page.getByRole('button', { name: 'Nova pasta' }).first().click();
  await settle(page, 400);
  await page.screenshot({ path: P('17-nova-pasta-modelos') });
  await page.keyboard.press('Escape');

  // configurações
  await page.getByRole('button', { name: 'Configurações' }).click();
  await settle(page, 600);
  await page.screenshot({ path: P('18-configuracoes') });
  await scrollTo(page, '#s-cats', 20);
  await page.screenshot({ path: P('19-configuracoes-categorias') });
  await scrollTo(page, '#s-data', 20);
  await page.locator('#exportMd').click();
  await expect(page.getByRole('status')).toContainText('Markdown salvo');
  await settle(page, 300);
  await page.screenshot({ path: P('20-configuracoes-dados') });

  // temas e barra recolhida
  await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
  for (const [theme, file] of [['white', '21-tema-claro'], ['rose-black', '22-tema-rosa'], ['blue-dark', '23-tema-azul']] as const) {
    await page.getByRole('button', { name: 'Tema', exact: true }).click();
    await page.locator(`[data-theme-id="${theme}"]`).click();
    await settle(page, 900);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: P(file) });
  }
  await page.getByRole('button', { name: 'Recolher barra lateral' }).click();
  await settle(page, 600);
  await page.screenshot({ path: P('24-barra-recolhida') });

  // apagar os exemplos deixa tudo limpo
  await page.getByRole('button', { name: 'Expandir barra lateral' }).click();
  await page.getByRole('button', { name: 'Grimo Notes, início' }).click();
  await page.locator('#removeExample').click();
  await expect(page.locator('h1')).toContainText('Um caderno para o que ainda não existe');
});
