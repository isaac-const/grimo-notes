import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { createMemoryRepo } from '../../src/lib/db/memory';
import { createSqlRepo, type SqlDriver } from '../../src/lib/db/sql';
import { importSnapshot, makeMarkdown, makeSnapshot, parseSnapshot } from '../../src/lib/backup';
import { docToMarkdown } from '../../src/lib/markdown';
import { DEFAULT_PREFS, sanitizePrefs } from '../../src/lib/prefs';
import type { Repo } from '../../src/lib/db/types';

const driver = (): SqlDriver => {
  const db = new DatabaseSync(':memory:');
  return { async execute(s, p = []) { db.prepare(s).run(...(p as never[])); }, async select<T>(s: string, p: unknown[] = []) { return db.prepare(s).all(...(p as never[])) as T[]; } };
};
const store = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }; };
const backends: [string, () => Promise<Repo>][] = [['memória', async () => createMemoryRepo(store())], ['SQLite', async () => createSqlRepo(driver())]];

const doc = JSON.stringify({ type: 'doc', content: [
  { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Plano' }] },
  { type: 'paragraph', content: [{ type: 'text', text: 'Texto ' }, { type: 'text', text: 'forte', marks: [{ type: 'bold' }] }, { type: 'text', text: ' e ' }, { type: 'text', text: 'site', marks: [{ type: 'link', attrs: { href: 'https://a.dev' } }] }] },
  { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'um' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'dois' }] }] }] },
  { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'feito' }] }] }] },
  { type: 'codeBlock', attrs: { language: 'sql' }, content: [{ type: 'text', text: 'select 1;' }] },
  { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] }, { type: 'tableHeader', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] }] }, { type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '1' }] }] }, { type: 'tableCell', content: [{ type: 'paragraph', content: [{ type: 'text', text: '2' }] }] }] }] },
  { type: 'callout', attrs: { tone: 'aviso' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'cuidado' }] }] },
  { type: 'drawing', attrs: { strokes: [] } },
] });

describe('markdown', () => {
  it('converte os blocos do editor', () => {
    const md = docToMarkdown(doc);
    expect(md).toContain('## Plano');
    expect(md).toContain('Texto **forte** e [site](https://a.dev)');
    expect(md).toContain('- um\n- dois');
    expect(md).toContain('- [x] feito');
    expect(md).toContain('```sql\nselect 1;\n```');
    expect(md).toContain('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(md).toContain('> **Atenção**\n> cuidado');
    expect(md).toContain('*[desenho]*');
  });
  it('texto puro passa direto', () => expect(docToMarkdown('só texto')).toBe('só texto'));
});

for (const [name, make] of backends) {
  describe(`backup (${name})`, () => {
    it('exporta e importa tudo em outra base, sem duplicar categorias', async () => {
      const a = await make();
      const f = await a.createFolder({ name: 'Viagens', hue: 200, template: 'app' });
      const i = await a.createIdea({ folderId: f.id, title: 'Roteiro' });
      const cats = await a.listCategories();
      await a.setIdeaCategories(i.id, [cats[0].id]);
      await a.updateIdea(i.id, { doc, status: 'progresso', due: '2026-12-10', pinned: true });
      const topics = await a.listTopics(i.id);
      await a.updateTopic(topics[0].id, { done: true });
      const snap = await makeSnapshot(a);
      const parsed = parseSnapshot(JSON.stringify(snap));
      expect(parsed.ok).toBe(true);
      const b = await make();
      const before = (await b.listCategories()).length;
      const r = await importSnapshot(b, snap);
      expect(r).toEqual({ folders: 1, ideas: 1 });
      expect((await b.listCategories()).length).toBe(before);
      const [fb] = await b.listFolders();
      const [ib] = await b.listIdeas(fb.id);
      expect(ib).toMatchObject({ title: 'Roteiro', status: 'progresso', due: '2026-12-10', pinned: true, doc });
      const tb = await b.listTopics(ib.id);
      expect(tb.map((t) => [t.title, t.done])).toEqual(topics.map((t, n) => [t.title, n === 0]));
      expect((await b.ideaCategories(ib.id)).map((c) => c.name)).toEqual([cats[0].name]);
    });

    it('importar duas vezes cria pastas novas e não mexe nas existentes', async () => {
      const a = await make();
      const f = await a.createFolder({ name: 'X', hue: 1 });
      await a.createIdea({ folderId: f.id, title: 'um' });
      const snap = await makeSnapshot(a);
      await importSnapshot(a, snap);
      expect((await a.listFolders()).length).toBe(2);
      expect((await a.listIdeas()).length).toBe(2);
    });

    it('categorias: editar e apagar tira o vínculo das ideias', async () => {
      const a = await make();
      const f = await a.createFolder({ name: 'X', hue: 1 });
      const i = await a.createIdea({ folderId: f.id, title: 'um' });
      const c = await a.createCategory({ name: 'Casa', group: 'Área', hue: 20 });
      await a.setIdeaCategories(i.id, [c.id]);
      await a.updateCategory(c.id, { name: 'Lar', hue: 99 });
      expect((await a.ideaCategories(i.id))[0]).toMatchObject({ name: 'Lar', hue: 99, group: 'Área' });
      await a.deleteCategory(c.id);
      expect(await a.ideaCategories(i.id)).toEqual([]);
      expect((await a.listCategories()).some((x) => x.id === c.id)).toBe(false);
    });

    it('markdown traz pastas, ideias, propriedades e tópicos', async () => {
      const a = await make();
      const f = await a.createFolder({ name: 'Estudos', hue: 1, template: 'app' });
      const i = await a.createIdea({ folderId: f.id, title: 'Redes' });
      await a.updateIdea(i.id, { doc, due: '2026-12-01' });
      const md = await makeMarkdown(a);
      expect(md).toContain('## Estudos');
      expect(md).toContain('### Redes');
      expect(md).toContain('Prazo: 2026-12-01');
      expect(md).toContain('- [ ] Problema');
      expect(md).toContain('##### Plano'); // títulos do texto descem de nível dentro da ideia
    });
  });
}

describe('arquivo de backup inválido', () => {
  it('recusa com motivo claro', () => {
    expect(parseSnapshot('não é json')).toEqual({ ok: false, error: 'O arquivo não é um JSON válido.' });
    expect(parseSnapshot('{"a":1}')).toMatchObject({ ok: false, error: expect.stringContaining('não é um backup') });
    expect(parseSnapshot(JSON.stringify({ app: 'grimo-notes', version: 1, folders: [{ id: 1 }], ideas: [], categories: [] }))).toMatchObject({ ok: false });
    expect(parseSnapshot(JSON.stringify({ app: 'grimo-notes', version: 1, folders: [], ideas: [{ id: 'a', folderId: 'b', title: 't', status: 'xis' }], categories: [] }))).toMatchObject({ ok: false });
  });
});

describe('preferências', () => {
  it('valores desconhecidos voltam ao padrão', () => {
    expect(sanitizePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(sanitizePrefs({ editorSize: 'gigante', reduceMotion: 'sim', bodyFont: 'mono' })).toEqual({ ...DEFAULT_PREFS, bodyFont: 'mono' });
    expect(sanitizePrefs({ editorSize: 'l', editorWidth: 'wide', reduceMotion: true, defaultView: 'kanban' })).toMatchObject({ editorSize: 'l', editorWidth: 'wide', reduceMotion: true, defaultView: 'kanban' });
  });
});
