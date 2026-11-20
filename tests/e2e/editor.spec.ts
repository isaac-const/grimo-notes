import { deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { newFolder, newIdea } from './helpers';

// PNG 8x6 de uma cor só, gerado na hora para não depender de arquivo.
function png(color: [number, number, number]) {
  const w = 160, h = 110;
  const crc = (b: Buffer) => { let x = ~0; for (const v of b) { x ^= v; for (let k = 0; k < 8; k++) x = x & 1 ? (x >>> 1) ^ 0xedb88320 : x >>> 1; } return ~x >>> 0; };
  const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const cr = Buffer.alloc(4); cr.writeUInt32BE(crc(td)); return Buffer.concat([l, td, cr]); };
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = color[0]; raw[o + 1] = color[1]; raw[o + 2] = color[2]; } }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function open(page: Page) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await newFolder(page, 'Jogos');
  await newIdea(page, 'Editor');
}
const doc = (page: Page) => page.locator('.grimo-doc');
const addImage = async (page: Page, color: [number, number, number], name = 'a.png') => {
  await page.locator('#grimo-pick-image').setInputFiles({ name, mimeType: 'image/png', buffer: png(color) });
  await expect(page.locator('.img-node')).not.toHaveCount(0);
};

test('escreve, formata e persiste como documento', async ({ page }) => {
  await open(page);
  await doc(page).click();
  await page.keyboard.type('Primeira linha');
  await expect(page.getByText('Salvo')).toBeVisible();
  await page.reload();
  await expect(doc(page)).toContainText('Primeira linha');
});

test('menu / insere checklist e título', async ({ page }) => {
  await open(page);
  await doc(page).click();
  await page.keyboard.type('/check');
  await expect(page.getByRole('listbox', { name: 'Inserir bloco' })).toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.type('Tarefa um');
  await expect(doc(page).locator('ul[data-type="taskList"] li')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('/títu');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Seção');
  await expect(doc(page).locator('h1')).toHaveText('Seção');
});

test('menu / fecha com Esc e não aparece no meio da frase', async ({ page }) => {
  await open(page);
  await doc(page).click();
  await page.keyboard.type('/');
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toHaveCount(0);
  await page.keyboard.press('Backspace');
  await page.keyboard.type('texto / barra');
  await expect(page.getByRole('listbox')).toHaveCount(0);
});

test('imagem: escolhe do computador, define cada posição, legenda e persiste', async ({ page }) => {
  await open(page);
  await doc(page).click();
  await page.keyboard.type('Texto antes da imagem.');
  await page.keyboard.press('Enter');
  await addImage(page, [200, 80, 60]);
  const img = page.locator('.img-node').first();
  await img.locator('img').click();
  await expect(page.getByRole('toolbar', { name: 'Posição da imagem' })).toBeVisible();
  for (const [label, cls] of [['Larga', 'wide'], ['Metade', 'half'], ['Terço', 'third'], ['Esquerda', 'left'], ['Direita', 'right'], ['Margem', 'margin'], ['Em linha', 'inline']] as const) {
    await page.getByRole('toolbar', { name: 'Posição da imagem' }).getByRole('button', { name: label }).click();
    await expect(page.locator(`.grimo-doc > [data-layout="${cls}"]`)).toHaveCount(1);
  }
  await page.getByLabel('Legenda da imagem').fill('Concept art');
  await page.waitForTimeout(700);
  await page.reload();
  await expect(page.getByLabel('Legenda da imagem')).toHaveValue('Concept art');
  await expect(page.locator('.img-node img')).toBeVisible();
});

test('redimensionar muda a largura e duas imagens "metade" ficam lado a lado', async ({ page }) => {
  await open(page);
  await doc(page).click();
  await addImage(page, [60, 120, 200]);
  await page.locator('.img-node img').first().click();
  const before = await page.locator('.img-node').first().evaluate((e) => e.getBoundingClientRect().width);
  const h = page.getByRole('separator', { name: 'Redimensionar imagem' });
  const b = (await h.boundingBox())!;
  await page.mouse.move(b.x + 5, b.y + 20);
  await page.mouse.down();
  await page.mouse.move(b.x - 200, b.y + 20, { steps: 6 });
  await page.mouse.up();
  const after = await page.locator('.img-node').first().evaluate((e) => e.getBoundingClientRect().width);
  expect(after).toBeLessThan(before - 100);

  await doc(page).click({ position: { x: 10, y: 10 } });
  await addImage(page, [90, 200, 120], 'b.png');
  await addImage(page, [200, 200, 60], 'c.png');
  const nodes = page.locator('.img-node');
  const n = await nodes.count();
  for (const i of [n - 2, n - 1]) {
    await nodes.nth(i).locator('img').click();
    await page.getByRole('toolbar', { name: 'Posição da imagem' }).getByRole('button', { name: 'Metade' }).click();
  }
  const [a, c] = await Promise.all([nodes.nth(n - 2).boundingBox(), nodes.nth(n - 1).boundingBox()]);
  expect(Math.abs(a!.y - c!.y)).toBeLessThan(6);
  expect(c!.x).toBeGreaterThan(a!.x + a!.width - 2);
});

test('colar imagem e arrastar para o texto', async ({ page }) => {
  await open(page);
  await doc(page).click();
  await page.keyboard.type('Cole aqui');
  const data = png([120, 60, 200]).toString('base64');
  await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const file = new File([bin], 'colada.png', { type: 'image/png' });
    const dt = new DataTransfer();
    dt.items.add(file);
    document.querySelector('.grimo-doc')!.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
  }, data);
  await expect(page.locator('.img-node')).toHaveCount(1);
  await page.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bin], 'solta.png', { type: 'image/png' }));
    const el = document.querySelector('.grimo-doc p')!;
    const r = el.getBoundingClientRect();
    el.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: r.left + 5, clientY: r.top + 5, bubbles: true, cancelable: true }));
  }, data);
  await expect(page.locator('.img-node')).toHaveCount(2);
});

test('captura de tela do editor com imagens em várias posições', async ({ page }) => {
  await open(page);
  await doc(page).click();
  await page.keyboard.type('/títu');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Premissa');
  await page.keyboard.press('Enter');
  await page.keyboard.insertText('Um jogo de masmorra aconchegante, onde cada sala é uma receita. O texto contorna a imagem flutuante e as referências ficam na margem, junto do parágrafo a que pertencem. Mais texto para a imagem à esquerda ter o que contornar e mostrar como o parágrafo flui ao redor dela, sem cortar nada e sem empurrar o resto da página para longe.');
  await page.keyboard.press('Control+Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Home');
  await addImage(page, [214, 120, 80], 'sala.png');
  await page.locator('.img-node img').first().click();
  await page.getByRole('toolbar', { name: 'Posição da imagem' }).getByRole('button', { name: 'Esquerda' }).click();
  await page.getByLabel('Legenda da imagem').fill('Sala da forja');
  await doc(page).locator('p').last().click({ position: { x: 300, y: 8 } });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'docs/prints/04-editor.png' });
});

test('imagem na margem fica à direita, com o texto ao lado, sem rolagem horizontal', async ({ page }) => {
  await open(page);
  await doc(page).click();
  await page.keyboard.insertText('Parágrafo com referência na margem. '.repeat(6));
  await page.keyboard.press('Home');
  await addImage(page, [70, 160, 140], 'ref.png');
  await page.locator('.img-node img').first().click();
  await page.getByRole('toolbar', { name: 'Posição da imagem' }).getByRole('button', { name: 'Margem' }).click();
  const [img, body] = await Promise.all([page.locator('.grimo-doc > [data-layout="margin"]').boundingBox(), doc(page).boundingBox()]);
  expect(img!.x + img!.width).toBeGreaterThan(body!.x + body!.width - 6);
  expect(img!.x).toBeGreaterThan(body!.x + body!.width / 2);
  const over = await page.locator('#main').evaluate((e) => e.scrollWidth - e.clientWidth);
  expect(over).toBeLessThanOrEqual(1);
});
