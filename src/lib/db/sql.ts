import { DEFAULT_CATEGORIES, templateOf } from './templates';
import type { Category, Folder, Idea, IdeaPatch, NewFolder, Repo, Status, TemplateId, Topic } from './types';

/** O mínimo que o repositório pede a um banco SQLite. O Tauri e o teste (node:sqlite) implementam o mesmo par. */
export interface SqlDriver {
  execute(sql: string, params?: unknown[]): Promise<void>;
  select<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

const MIGRATIONS: string[][] = [
  [
    `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
    `CREATE TABLE folders (id TEXT PRIMARY KEY, name TEXT NOT NULL, hue INTEGER NOT NULL, icon TEXT NOT NULL, template TEXT NOT NULL, sort INTEGER NOT NULL, created_at TEXT NOT NULL)`,
    `CREATE TABLE ideas (id TEXT PRIMARY KEY, folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE, title TEXT NOT NULL, doc TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'ideia', due TEXT, pinned INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
    `CREATE INDEX idx_ideas_folder ON ideas(folder_id)`,
    `CREATE TABLE topics (id TEXT PRIMARY KEY, idea_id TEXT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE, title TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0, sort INTEGER NOT NULL)`,
    `CREATE INDEX idx_topics_idea ON topics(idea_id)`,
    `CREATE TABLE categories (id TEXT PRIMARY KEY, name TEXT NOT NULL, grp TEXT NOT NULL, hue INTEGER NOT NULL)`,
    `CREATE TABLE idea_categories (idea_id TEXT NOT NULL, category_id TEXT NOT NULL, sort INTEGER NOT NULL, PRIMARY KEY (idea_id, category_id))`,
  ],
];

export async function migrate(db: SqlDriver): Promise<void> {
  await db.execute(`CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  const row = await db.select<{ value: string }>(`SELECT value FROM meta WHERE key = 'version'`);
  let v = row.length ? Number(row[0].value) : 0;
  while (v < MIGRATIONS.length) {
    for (const sql of MIGRATIONS[v]) if (!sql.startsWith('CREATE TABLE IF NOT EXISTS meta')) await db.execute(sql);
    v++;
    await db.execute(`INSERT INTO meta (key, value) VALUES ('version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [String(v)]);
  }
  // as categorias de partida entram uma vez só; quem apagar todas não as vê voltar
  const seeded = await db.select<{ value: string }>(`SELECT value FROM meta WHERE key = 'seeded'`);
  if (!seeded.length) {
    const n = await db.select<{ n: number }>(`SELECT COUNT(*) AS n FROM categories`);
    if (!n[0] || Number(n[0].n) === 0) {
      for (const c of DEFAULT_CATEGORIES) await db.execute(`INSERT INTO categories (id, name, grp, hue) VALUES (?, ?, ?, ?)`, [crypto.randomUUID(), c.name, c.group, c.hue]);
    }
    await db.execute(`INSERT INTO meta (key, value) VALUES ('seeded', '1')`);
  }
}

const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

type FolderRow = { id: string; name: string; hue: number; icon: string; template: string; sort: number; created_at: string };
type IdeaRow = { id: string; folder_id: string; title: string; doc: string; status: string; due: string | null; pinned: number; created_at: string; updated_at: string };
type TopicRow = { id: string; idea_id: string; title: string; done: number; sort: number };
type CatRow = { id: string; name: string; grp: string; hue: number };

const toFolder = (r: FolderRow): Folder => ({ id: r.id, name: r.name, hue: Number(r.hue), icon: r.icon, template: r.template as TemplateId, sort: Number(r.sort), createdAt: r.created_at });
const toIdea = (r: IdeaRow): Idea => ({ id: r.id, folderId: r.folder_id, title: r.title, doc: r.doc, status: r.status as Status, due: r.due, pinned: Number(r.pinned) === 1, createdAt: r.created_at, updatedAt: r.updated_at });
const toTopic = (r: TopicRow): Topic => ({ id: r.id, ideaId: r.idea_id, title: r.title, done: Number(r.done) === 1, sort: Number(r.sort) });
const toCat = (r: CatRow): Category => ({ id: r.id, name: r.name, group: r.grp, hue: Number(r.hue) });

export async function createSqlRepo(db: SqlDriver): Promise<Repo> {
  await migrate(db);
  const getIdea = async (id: string) => {
    const r = await db.select<IdeaRow>(`SELECT * FROM ideas WHERE id = ?`, [id]);
    return r[0] ? toIdea(r[0]) : null;
  };
  return {
    async listFolders() {
      return (await db.select<FolderRow>(`SELECT * FROM folders ORDER BY sort, created_at`)).map(toFolder);
    },
    async createFolder(f: NewFolder) {
      const tpl = templateOf(f.template ?? 'livre');
      const c = await db.select<{ n: number }>(`SELECT COUNT(*) AS n FROM folders`);
      const folder: Folder = { id: uid(), name: f.name.trim(), hue: f.hue, icon: f.icon ?? tpl.icon, template: tpl.id, sort: Number(c[0]?.n ?? 0), createdAt: now() };
      await db.execute(`INSERT INTO folders (id, name, hue, icon, template, sort, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`, [folder.id, folder.name, folder.hue, folder.icon, folder.template, folder.sort, folder.createdAt]);
      return folder;
    },
    async updateFolder(id, patch) {
      const keys = Object.keys(patch) as (keyof typeof patch)[];
      if (!keys.length) return;
      await db.execute(`UPDATE folders SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`, [...keys.map((k) => patch[k]), id]);
    },
    async deleteFolder(id) {
      await db.execute(`DELETE FROM topics WHERE idea_id IN (SELECT id FROM ideas WHERE folder_id = ?)`, [id]);
      await db.execute(`DELETE FROM idea_categories WHERE idea_id IN (SELECT id FROM ideas WHERE folder_id = ?)`, [id]);
      await db.execute(`DELETE FROM ideas WHERE folder_id = ?`, [id]);
      await db.execute(`DELETE FROM folders WHERE id = ?`, [id]);
    },

    async listIdeas(folderId) {
      const rows = folderId
        ? await db.select<IdeaRow>(`SELECT * FROM ideas WHERE folder_id = ? ORDER BY updated_at DESC`, [folderId])
        : await db.select<IdeaRow>(`SELECT * FROM ideas ORDER BY updated_at DESC`);
      return rows.map(toIdea);
    },
    getIdea,
    async createIdea({ folderId, title }) {
      const fr = await db.select<FolderRow>(`SELECT * FROM folders WHERE id = ?`, [folderId]);
      const t = now();
      const idea: Idea = { id: uid(), folderId, title: title.trim() || 'Sem título', doc: '', status: 'ideia', due: null, pinned: false, createdAt: t, updatedAt: t };
      await db.execute(`INSERT INTO ideas (id, folder_id, title, doc, status, due, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [idea.id, idea.folderId, idea.title, idea.doc, idea.status, null, 0, t, t]);
      const names = fr[0] ? templateOf(fr[0].template as TemplateId).topics : [];
      for (let i = 0; i < names.length; i++) await db.execute(`INSERT INTO topics (id, idea_id, title, done, sort) VALUES (?, ?, ?, 0, ?)`, [uid(), idea.id, names[i], i]);
      return idea;
    },
    async updateIdea(id, patch: IdeaPatch) {
      const map: Record<string, string> = { title: 'title', doc: 'doc', status: 'status', due: 'due', pinned: 'pinned', folderId: 'folder_id' };
      const keys = Object.keys(patch) as (keyof IdeaPatch)[];
      const sets = keys.map((k) => `${map[k]} = ?`);
      const vals = keys.map((k) => (k === 'pinned' ? (patch.pinned ? 1 : 0) : patch[k]));
      await db.execute(`UPDATE ideas SET ${[...sets, 'updated_at = ?'].join(', ')} WHERE id = ?`, [...vals, now(), id]);
    },
    async deleteIdea(id) {
      await db.execute(`DELETE FROM topics WHERE idea_id = ?`, [id]);
      await db.execute(`DELETE FROM idea_categories WHERE idea_id = ?`, [id]);
      await db.execute(`DELETE FROM ideas WHERE id = ?`, [id]);
    },

    async listTopics(ideaId) {
      return (await db.select<TopicRow>(`SELECT * FROM topics WHERE idea_id = ? ORDER BY sort`, [ideaId])).map(toTopic);
    },
    async addTopic(ideaId, title) {
      const c = await db.select<{ n: number }>(`SELECT COUNT(*) AS n FROM topics WHERE idea_id = ?`, [ideaId]);
      const topic: Topic = { id: uid(), ideaId, title: title.trim(), done: false, sort: Number(c[0]?.n ?? 0) };
      await db.execute(`INSERT INTO topics (id, idea_id, title, done, sort) VALUES (?, ?, ?, 0, ?)`, [topic.id, ideaId, topic.title, topic.sort]);
      return topic;
    },
    async updateTopic(id, patch) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (patch.title !== undefined) (sets.push('title = ?'), vals.push(patch.title));
      if (patch.done !== undefined) (sets.push('done = ?'), vals.push(patch.done ? 1 : 0));
      if (!sets.length) return;
      await db.execute(`UPDATE topics SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    },
    async deleteTopic(id) {
      await db.execute(`DELETE FROM topics WHERE id = ?`, [id]);
    },

    async listCategories() {
      return (await db.select<CatRow>(`SELECT * FROM categories ORDER BY grp, name`)).map(toCat);
    },
    async createCategory(c) {
      const cat: Category = { id: uid(), ...c };
      await db.execute(`INSERT INTO categories (id, name, grp, hue) VALUES (?, ?, ?, ?)`, [cat.id, cat.name, cat.group, cat.hue]);
      return cat;
    },
    async updateCategory(id, patch) {
      const sets: string[] = [];
      const vals: unknown[] = [];
      if (patch.name !== undefined) (sets.push('name = ?'), vals.push(patch.name));
      if (patch.group !== undefined) (sets.push('grp = ?'), vals.push(patch.group));
      if (patch.hue !== undefined) (sets.push('hue = ?'), vals.push(patch.hue));
      if (!sets.length) return;
      await db.execute(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
    },
    async deleteCategory(id) {
      await db.execute(`DELETE FROM idea_categories WHERE category_id = ?`, [id]);
      await db.execute(`DELETE FROM categories WHERE id = ?`, [id]);
    },
    async ideaCategories(ideaId) {
      return (await db.select<CatRow>(`SELECT c.* FROM categories c JOIN idea_categories l ON l.category_id = c.id WHERE l.idea_id = ? ORDER BY l.sort`, [ideaId])).map(toCat);
    },
    async setIdeaCategories(ideaId, ids) {
      await db.execute(`DELETE FROM idea_categories WHERE idea_id = ?`, [ideaId]);
      for (let i = 0; i < ids.length; i++) await db.execute(`INSERT INTO idea_categories (idea_id, category_id, sort) VALUES (?, ?, ?)`, [ideaId, ids[i], i]);
    },
    async primaryHues() {
      const rows = await db.select<{ idea_id: string; hue: number }>(`SELECT l.idea_id AS idea_id, c.hue AS hue FROM idea_categories l JOIN categories c ON c.id = l.category_id WHERE l.sort = 0`);
      return Object.fromEntries(rows.map((r) => [r.idea_id, Number(r.hue)]));
    },
  };
}
