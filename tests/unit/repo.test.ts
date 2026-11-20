import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { createMemoryRepo } from '../../src/lib/db/memory';
import { createSqlRepo, type SqlDriver } from '../../src/lib/db/sql';
import { TEMPLATES } from '../../src/lib/db/templates';
import type { Repo } from '../../src/lib/db/types';

function nodeDriver(): SqlDriver {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  return {
    async execute(sql, params = []) {
      db.prepare(sql).run(...(params as never[]));
    },
    async select<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
  };
}

const memStore = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};

// Os dois armazenamentos passam exatamente pelos mesmos testes.
const backends: [string, () => Promise<Repo>][] = [
  ['memória', async () => createMemoryRepo(memStore())],
  ['SQLite', async () => createSqlRepo(nodeDriver())],
];

for (const [name, make] of backends) {
  describe(`repositório (${name})`, () => {
    it('cria pasta e lista na ordem', async () => {
      const r = await make();
      await r.createFolder({ name: 'Jogos', hue: 285, template: 'jogo' });
      await r.createFolder({ name: 'Mods', hue: 150, template: 'mod' });
      const fs = await r.listFolders();
      expect(fs.map((f) => f.name)).toEqual(['Jogos', 'Mods']);
      expect(fs[0].icon).toBe('gamepad');
    });

    it('ideia nova em pasta com modelo já nasce com os tópicos do modelo', async () => {
      const r = await make();
      const f = await r.createFolder({ name: 'Jogos', hue: 285, template: 'jogo' });
      const i = await r.createIdea({ folderId: f.id, title: '  Plano de estudo  ' });
      expect(i.title).toBe('Plano de estudo');
      expect(i.status).toBe('ideia');
      expect((await r.listTopics(i.id)).map((t) => t.title)).toEqual(TEMPLATES.find((t) => t.id === 'jogo')!.topics);
    });

    it('pasta livre não cria tópicos e título vazio vira "Sem título"', async () => {
      const r = await make();
      const f = await r.createFolder({ name: 'Livre', hue: 25 });
      const i = await r.createIdea({ folderId: f.id, title: '   ' });
      expect(i.title).toBe('Sem título');
      expect(await r.listTopics(i.id)).toEqual([]);
    });

    it('atualiza ideia e a mais recente vem primeiro', async () => {
      const r = await make();
      const f = await r.createFolder({ name: 'A', hue: 1 });
      const a = await r.createIdea({ folderId: f.id, title: 'a' });
      const b = await r.createIdea({ folderId: f.id, title: 'b' });
      await new Promise((x) => setTimeout(x, 5));
      await r.updateIdea(a.id, { title: 'a2', status: 'progresso', pinned: true, due: '2026-12-01', doc: 'texto' });
      const got = await r.getIdea(a.id);
      expect(got).toMatchObject({ title: 'a2', status: 'progresso', pinned: true, due: '2026-12-01', doc: 'texto' });
      expect((await r.listIdeas(f.id)).map((x) => x.id)).toEqual([a.id, b.id]);
      await r.updateIdea(a.id, { pinned: false, due: null });
      expect(await r.getIdea(a.id)).toMatchObject({ pinned: false, due: null });
    });

    it('tópicos: adicionar, concluir, renomear e apagar', async () => {
      const r = await make();
      const f = await r.createFolder({ name: 'A', hue: 1 });
      const i = await r.createIdea({ folderId: f.id, title: 'x' });
      const t1 = await r.addTopic(i.id, 'Um');
      const t2 = await r.addTopic(i.id, 'Dois');
      await r.updateTopic(t1.id, { done: true });
      await r.updateTopic(t2.id, { title: 'Dois!' });
      expect((await r.listTopics(i.id)).map((t) => [t.title, t.done])).toEqual([['Um', true], ['Dois!', false]]);
      await r.deleteTopic(t1.id);
      expect((await r.listTopics(i.id)).length).toBe(1);
    });

    it('categorias: a primeira é a principal e dá a cor da fita', async () => {
      const r = await make();
      const f = await r.createFolder({ name: 'A', hue: 1 });
      const i = await r.createIdea({ folderId: f.id, title: 'x' });
      const cats = await r.listCategories();
      expect(cats.length).toBeGreaterThan(5);
      const [c1, c2] = [cats.find((c) => c.name === '2D')!, cats.find((c) => c.name === 'PC')!];
      await r.setIdeaCategories(i.id, [c2.id, c1.id]);
      expect((await r.ideaCategories(i.id)).map((c) => c.name)).toEqual(['PC', '2D']);
      expect((await r.primaryHues())[i.id]).toBe(c2.hue);
      await r.setIdeaCategories(i.id, []);
      expect((await r.primaryHues())[i.id]).toBeUndefined();
      const novo = await r.createCategory({ name: 'Roguelike', group: 'Gênero', hue: 330 });
      expect((await r.listCategories()).some((c) => c.id === novo.id)).toBe(true);
    });

    it('apagar pasta leva ideias, tópicos e categorias junto; apagar ideia só a ideia', async () => {
      const r = await make();
      const f = await r.createFolder({ name: 'A', hue: 1, template: 'app' });
      const g = await r.createFolder({ name: 'B', hue: 2, template: 'app' });
      const i = await r.createIdea({ folderId: f.id, title: 'x' });
      const j = await r.createIdea({ folderId: g.id, title: 'y' });
      await r.setIdeaCategories(i.id, [(await r.listCategories())[0].id]);
      await r.deleteFolder(f.id);
      expect(await r.getIdea(i.id)).toBeNull();
      expect(await r.listTopics(i.id)).toEqual([]);
      expect((await r.listFolders()).map((x) => x.id)).toEqual([g.id]);
      await r.deleteIdea(j.id);
      expect(await r.listIdeas()).toEqual([]);
      expect((await r.listFolders()).length).toBe(1);
    });

    it('renomear pasta', async () => {
      const r = await make();
      const f = await r.createFolder({ name: 'A', hue: 1 });
      await r.updateFolder(f.id, { name: 'Novo', hue: 99 });
      expect((await r.listFolders())[0]).toMatchObject({ name: 'Novo', hue: 99 });
    });
  });
}

describe('migração do SQLite', () => {
  it('rodar duas vezes não duplica nada', async () => {
    const d = nodeDriver();
    await createSqlRepo(d);
    const r2 = await createSqlRepo(d);
    const cats = await r2.listCategories();
    expect(new Set(cats.map((c) => c.id)).size).toBe(cats.length);
    expect(cats.length).toBe(9);
  });
});

describe('categorias de partida', () => {
  it('não voltam depois de apagadas (SQLite e memória)', async () => {
    const d = nodeDriver();
    const a = await createSqlRepo(d);
    for (const c of await a.listCategories()) await a.deleteCategory(c.id);
    expect(await (await createSqlRepo(d)).listCategories()).toEqual([]);
    const store = memStore();
    const m = createMemoryRepo(store);
    for (const c of await m.listCategories()) await m.deleteCategory(c.id);
    expect(await createMemoryRepo(store).listCategories()).toEqual([]);
  });
});
