import { expect, test, type Page } from '@playwright/test';
import { newFolder, newIdea } from './helpers';

async function open(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await newFolder(page, 'Jogos');
  await newIdea(page, 'Editor');
  await page.locator('.grimo-doc').click();
}
const doc = (page: Page) => page.locator('.grimo-doc');
const slash = async (page: Page, q: string) => {
  await page.keyboard.type('/' + q);
  await expect(page.getByRole('listbox', { name: 'Inserir bloco' })).toBeVisible();
  await page.keyboard.press('Enter');
};
// seleciona a linha onde está o cursor (o editor mantém um parágrafo vazio no fim, então Ctrl+A pegaria mais de um tipo de bloco)
const selectAll = async (page: Page) => {
  await page.keyboard.press('Home');
  await page.keyboard.press('Shift+End');
  await expect(page.getByRole('button', { name: 'Negrito' })).toBeVisible();
};

test.describe('menu /', () => {
  test('mostra grupos Básico, Mídia e Avançado e filtra por apelido (h1, todo, num, div)', async ({ page }) => {
    await open(page);
    await page.keyboard.type('/');
    const lb = page.getByRole('listbox', { name: 'Inserir bloco' });
    await expect(lb).toBeVisible();
    for (const g of ['Básico', 'Mídia', 'Avançado']) await expect(lb.getByText(g, { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.keyboard.press('Backspace');
    await slash(page, 'h1');
    await page.keyboard.type('Um');
    await page.keyboard.press('Enter');
    await slash(page, 'todo');
    await page.keyboard.type('Fazer');
    await expect(doc(page).locator('h1')).toHaveText('Um');
    await expect(doc(page).locator('ul[data-type="taskList"]')).toHaveCount(1);
  });

  test('funciona depois de uma palavra, não só no começo da linha', async ({ page }) => {
    await open(page);
    await page.keyboard.type('Vamos ');
    await slash(page, 'div');
    await expect(doc(page).locator('hr')).toHaveCount(1);
    await expect(doc(page)).toContainText('Vamos');
  });

  test('destaque, lista recolhível, tabela e data', async ({ page }) => {
    await open(page);
    await slash(page, 'callout');
    await page.keyboard.type('Ideia importante');
    await expect(doc(page).locator('[data-callout]')).toContainText('Ideia importante');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await slash(page, 'toggle');
    await expect(doc(page).locator('[data-type="details"]')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await slash(page, 'tabela');
    await expect(doc(page).locator('table tr')).toHaveCount(3);
    await expect(doc(page).locator('table th')).toHaveCount(3);
  });

  test('atalhos de markdown: # , [] e ---', async ({ page }) => {
    await open(page);
    await page.keyboard.type('## Subtítulo');
    await page.keyboard.press('Enter');
    await page.keyboard.type('[] item');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('---');
    await expect(doc(page).locator('h2')).toHaveText('Subtítulo');
    await expect(doc(page).locator('ul[data-type="taskList"] li')).toHaveCount(1);
    await expect(doc(page).locator('hr')).toHaveCount(1);
  });
});

test.describe('seleção de texto', () => {
  test('negrito, itálico, sublinhado e tachado', async ({ page }) => {
    await open(page);
    await page.keyboard.type('Texto para estilizar');
    await selectAll(page);
    for (const n of ['Negrito', 'Itálico', 'Sublinhado', 'Tachado']) await page.getByRole('button', { name: n }).click();
    const html = await doc(page).innerHTML();
    for (const t of ['<strong>', '<em>', '<u>', '<s>']) expect(html).toContain(t);
  });

  test('transformar em: título, lista e destaque', async ({ page }) => {
    await open(page);
    await page.keyboard.type('Bloco');
    await selectAll(page);
    await page.getByRole('button', { name: /Texto/ }).first().click();
    await page.getByRole('menuitem', { name: 'Título 2' }).click();
    await expect(doc(page).locator('h2')).toHaveText('Bloco');
    await selectAll(page);
    await page.getByRole('button', { name: /Título 2/ }).first().click();
    await page.getByRole('menuitem', { name: 'Lista', exact: true }).click();
    await expect(doc(page).locator('ul li')).toHaveCount(1);
  });

  test('cor do texto, cor de fundo e tamanho', async ({ page }) => {
    await open(page);
    await page.keyboard.type('Colorido');
    await selectAll(page);
    await page.getByRole('button', { name: 'Cor do texto e do fundo' }).click();
    await page.getByRole('button', { name: 'Texto Vermelho' }).click();
    await selectAll(page);
    await page.getByRole('button', { name: 'Cor do texto e do fundo' }).click();
    await page.getByRole('button', { name: 'Fundo Amarelo' }).click();
    await selectAll(page);
    await page.getByRole('button', { name: 'Tamanho do texto' }).click();
    await page.getByRole('menuitem', { name: 'Grande' }).click();
    const html = await doc(page).innerHTML();
    expect(html).toContain('<mark');
    expect(html).toMatch(/color:\s*oklch/);
    expect(html).toContain('font-size: 21px');
  });

  test('alinhar ao centro e aplicar link', async ({ page }) => {
    await open(page);
    await page.keyboard.type('Centro e link');
    await selectAll(page);
    await page.getByRole('button', { name: 'Alinhar ao centro' }).click();
    await expect(doc(page).locator('p[style*="text-align: center"]')).toHaveCount(1);
    await selectAll(page);
    await page.getByRole('button', { name: 'Link', exact: true }).click();
    await page.getByLabel('Endereço do link').fill('exemplo.com');
    await page.keyboard.press('Enter');
    await expect(doc(page).locator('a')).toHaveAttribute('href', 'https://exemplo.com');
  });
});

test.describe('alça do bloco', () => {
  test('aparece ao passar o mouse, insere bloco abaixo e duplica e apaga pelo menu', async ({ page }) => {
    await open(page);
    await page.keyboard.type('Primeiro bloco');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Segundo bloco');
    await doc(page).locator('p').first().hover();
    const plus = page.getByRole('button', { name: 'Inserir bloco abaixo' });
    await expect(plus).toBeVisible();
    await plus.click();
    await expect(page.getByRole('listbox', { name: 'Inserir bloco' })).toBeVisible();
    await page.keyboard.press('Escape');
    await doc(page).locator('p').first().hover();
    await page.getByRole('button', { name: /Arrastar ou abrir menu/ }).click();
    await page.getByRole('menuitem', { name: 'Duplicar' }).click();
    await expect(doc(page).locator('p', { hasText: 'Primeiro bloco' })).toHaveCount(2);
    await doc(page).locator('p', { hasText: 'Primeiro bloco' }).first().hover();
    await page.getByRole('button', { name: /Arrastar ou abrir menu/ }).click();
    await page.getByRole('menuitem', { name: 'Apagar' }).click();
    await expect(doc(page).locator('p', { hasText: 'Primeiro bloco' })).toHaveCount(1);
  });
});

test.describe('desenho', () => {
  const stroke = async (page: Page, dx = 0) => {
    const b = (await page.locator('.drawing-canvas').boundingBox())!;
    await page.mouse.move(b.x + 60 + dx, b.y + 60);
    await page.mouse.down();
    await page.mouse.move(b.x + 160 + dx, b.y + 100, { steps: 6 });
    await page.mouse.move(b.x + 240 + dx, b.y + 70, { steps: 6 });
    await page.mouse.up();
  };

  test('desenhar, trocar de cor, desfazer, borracha, limpar e persistir', async ({ page }) => {
    await open(page);
    await slash(page, 'desenho');
    await expect(page.getByRole('toolbar', { name: 'Ferramentas de desenho' })).toBeVisible();
    await stroke(page);
    await expect(page.locator('.drawing-canvas path')).toHaveCount(1);
    await page.getByRole('button', { name: 'Cor 3' }).click();
    await stroke(page, 40);
    await expect(page.locator('.drawing-canvas path')).toHaveCount(2);
    await page.getByRole('button', { name: 'Desfazer' }).click();
    await expect(page.locator('.drawing-canvas path')).toHaveCount(1);
    await page.getByRole('button', { name: 'Borracha' }).click();
    const b = (await page.locator('.drawing-canvas').boundingBox())!;
    await page.mouse.move(b.x + 60, b.y + 60);
    await page.mouse.down();
    await page.mouse.up();
    await expect(page.locator('.drawing-canvas path')).toHaveCount(0);
    await page.getByRole('button', { name: 'Caneta' }).click();
    await stroke(page);
    await page.getByRole('button', { name: 'Pronto' }).click();
    await expect(page.getByRole('button', { name: 'Editar desenho' })).toBeVisible();
    await expect(page.getByText('Salvo')).toBeVisible();
    await page.reload();
    await expect(page.locator('.drawing-canvas path')).toHaveCount(1);
  });

  test('limpar e ajustar o tamanho da área', async ({ page }) => {
    await open(page);
    await slash(page, 'draw');
    await stroke(page);
    const h0 = (await page.locator('.drawing-canvas').boundingBox())!.height;
    await page.getByRole('button', { name: 'Maior' }).click();
    expect((await page.locator('.drawing-canvas').boundingBox())!.height).toBeGreaterThan(h0 + 20);
    await page.getByRole('button', { name: 'Limpar' }).click();
    await expect(page.locator('.drawing-canvas path')).toHaveCount(0);
  });
});

test.describe('mídia', () => {
  test('vídeo do YouTube vira player e o tamanho muda', async ({ page }) => {
    await open(page);
    await slash(page, 'video');
    await page.getByPlaceholder(/YouTube/).fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await page.getByRole('button', { name: 'Inserir' }).click();
    const frame = page.locator('iframe.embed-frame');
    await expect(frame).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
    await page.locator('.embed').click({ position: { x: 4, y: 4 } });
    const w0 = (await frame.boundingBox())!.width;
    await page.getByRole('toolbar', { name: 'Tamanho da mídia' }).getByRole('button', { name: 'P', exact: true }).click();
    expect((await frame.boundingBox())!.width).toBeLessThan(w0 - 50);
  });

  test('link de site vira cartão, e endereço inválido mostra erro', async ({ page }) => {
    await open(page);
    await slash(page, 'link');
    await page.getByPlaceholder(/YouTube/).fill('docs.exemplo.dev/guia');
    await page.getByRole('button', { name: 'Inserir' }).click();
    await expect(page.locator('.bookmark')).toContainText('docs.exemplo.dev');
    await page.locator('.grimo-doc p').last().click();
    await slash(page, 'video');
    await page.getByPlaceholder(/YouTube/).fill('http://');
    await page.getByRole('button', { name: 'Inserir' }).click();
    await expect(page.getByRole('alert')).toContainText('não parece válido');
  });
});

test('tabela: adicionar e remover linha e coluna', async ({ page }) => {
  await open(page);
  await slash(page, 'tabela');
  await page.locator('.grimo-doc td').first().click();
  await expect(page.getByRole('toolbar', { name: 'Tabela' })).toBeVisible();
  await page.getByRole('button', { name: '+ Linha' }).click();
  await expect(page.locator('.grimo-doc table tr')).toHaveCount(4);
  await page.getByRole('button', { name: '+ Coluna' }).click();
  await expect(page.locator('.grimo-doc table tr').first().locator('th')).toHaveCount(4);
  await page.getByRole('button', { name: '− Linha' }).click();
  await expect(page.locator('.grimo-doc table tr')).toHaveCount(3);
});

test('painel de propriedades recolhe e lembra a escolha', async ({ page }) => {
  await open(page);
  await expect(page.getByRole('complementary', { name: 'Propriedades' })).toBeVisible();
  await page.getByRole('button', { name: 'Esconder propriedades' }).click();
  await expect(page.getByRole('complementary', { name: 'Propriedades' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('complementary', { name: 'Propriedades' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mostrar propriedades' }).click();
  await expect(page.getByRole('complementary', { name: 'Propriedades' })).toBeVisible();
});

test('as fontes são as do KaniBox', async ({ page }) => {
  await open(page);
  const f = await page.evaluate(() => ({ title: getComputedStyle(document.querySelector('input[aria-label="Título da ideia"]')!).fontFamily, body: getComputedStyle(document.querySelector('.grimo-doc')!).fontFamily, mono: getComputedStyle(document.querySelector('[aria-live="polite"]')!).fontFamily }));
  expect(f.title).toContain('Familjen Grotesk');
  expect(f.body).toContain('Hanken Grotesk');
  expect(f.mono).toContain('Geist Mono');
  expect(`${f.title}${f.body}`).not.toContain('Newsreader');
});

test('não existe atalho Ctrl+K', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Control+k');
  await expect(page.locator('[cmdk-root]')).toHaveCount(0);
  await expect(page.locator('aside')).not.toContainText('Ctrl');
});
