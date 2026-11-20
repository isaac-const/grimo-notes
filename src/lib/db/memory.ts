import { DEFAULT_CATEGORIES, templateOf } from './templates';
import type { Category, Folder, Idea, IdeaPatch, NewFolder, Repo, Topic } from './types';

interface Snapshot {
  folders: Folder[];
  ideas: Idea[];
  topics: Topic[];
  categories: Category[];
  links: { ideaId: string; categoryId: string; sort: number }[];
}

const KEY = 'grimo-data-v1';
const uid = () => crypto.randomUUID();
const now = () => new Date().toISOString();

/** Armazenamento em memória, com cópia no localStorage quando existe. Serve para o navegador (dev e testes). */
export function createMemoryRepo(storage: Pick<Storage, 'getItem' | 'setItem'> | null = typeof localStorage !== 'undefined' ? localStorage : null): Repo {
  let db: Snapshot = { folders: [], ideas: [], topics: [], categories: [], links: [] };
  let saved = false;
  try {
    const raw = storage?.getItem(KEY);
    if (raw) (db = JSON.parse(raw) as Snapshot, (saved = true));
  } catch {
    /* começa vazio */
  }
  // as categorias de partida só entram na primeira vez; quem apagar todas não as vê voltar
  if (!saved) db.categories = DEFAULT_CATEGORIES.map((c) => ({ id: uid(), ...c }));
  const save = () => {
    try {
      storage?.setItem(KEY, JSON.stringify(db));
    } catch {
      /* sem armazenamento */
    }
  };
  save();

  return {
    async listFolders() {
      return [...db.folders].sort((a, b) => a.sort - b.sort);
    },
    async createFolder(f: NewFolder) {
      const tpl = templateOf(f.template ?? 'livre');
      const folder: Folder = { id: uid(), name: f.name.trim(), hue: f.hue, icon: f.icon ?? tpl.icon, template: tpl.id, sort: db.folders.length, createdAt: now() };
      db.folders.push(folder);
      save();
      return folder;
    },
    async updateFolder(id, patch) {
      const f = db.folders.find((x) => x.id === id);
      if (f) Object.assign(f, patch);
      save();
    },
    async deleteFolder(id) {
      const ids = db.ideas.filter((i) => i.folderId === id).map((i) => i.id);
      db.topics = db.topics.filter((t) => !ids.includes(t.ideaId));
      db.links = db.links.filter((l) => !ids.includes(l.ideaId));
      db.ideas = db.ideas.filter((i) => i.folderId !== id);
      db.folders = db.folders.filter((f) => f.id !== id);
      save();
    },

    async listIdeas(folderId) {
      return db.ideas.filter((i) => !folderId || i.folderId === folderId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async getIdea(id) {
      return db.ideas.find((i) => i.id === id) ?? null;
    },
    async createIdea({ folderId, title }) {
      const folder = db.folders.find((f) => f.id === folderId);
      const t = now();
      const idea: Idea = { id: uid(), folderId, title: title.trim() || 'Sem título', doc: '', status: 'ideia', due: null, pinned: false, createdAt: t, updatedAt: t };
      db.ideas.push(idea);
      (folder ? templateOf(folder.template).topics : []).forEach((name, i) => db.topics.push({ id: uid(), ideaId: idea.id, title: name, done: false, sort: i }));
      save();
      return idea;
    },
    async updateIdea(id, patch: IdeaPatch) {
      const i = db.ideas.find((x) => x.id === id);
      if (!i) return;
      Object.assign(i, patch, { updatedAt: now() });
      save();
    },
    async deleteIdea(id) {
      db.topics = db.topics.filter((t) => t.ideaId !== id);
      db.links = db.links.filter((l) => l.ideaId !== id);
      db.ideas = db.ideas.filter((i) => i.id !== id);
      save();
    },

    async listTopics(ideaId) {
      return db.topics.filter((t) => t.ideaId === ideaId).sort((a, b) => a.sort - b.sort);
    },
    async addTopic(ideaId, title) {
      const sort = db.topics.filter((t) => t.ideaId === ideaId).length;
      const topic: Topic = { id: uid(), ideaId, title: title.trim(), done: false, sort };
      db.topics.push(topic);
      save();
      return topic;
    },
    async updateTopic(id, patch) {
      const t = db.topics.find((x) => x.id === id);
      if (t) Object.assign(t, patch);
      save();
    },
    async deleteTopic(id) {
      db.topics = db.topics.filter((t) => t.id !== id);
      save();
    },

    async listCategories() {
      return [...db.categories];
    },
    async createCategory(c) {
      const cat: Category = { id: uid(), ...c };
      db.categories.push(cat);
      save();
      return cat;
    },
    async updateCategory(id, patch) {
      const c = db.categories.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
      save();
    },
    async deleteCategory(id) {
      db.categories = db.categories.filter((c) => c.id !== id);
      db.links = db.links.filter((l) => l.categoryId !== id);
      save();
    },
    async ideaCategories(ideaId) {
      return db.links
        .filter((l) => l.ideaId === ideaId)
        .sort((a, b) => a.sort - b.sort)
        .map((l) => db.categories.find((c) => c.id === l.categoryId)!)
        .filter(Boolean);
    },
    async setIdeaCategories(ideaId, ids) {
      db.links = db.links.filter((l) => l.ideaId !== ideaId);
      ids.forEach((categoryId, sort) => db.links.push({ ideaId, categoryId, sort }));
      save();
    },
    async primaryHues() {
      const out: Record<string, number> = {};
      for (const l of [...db.links].sort((a, b) => a.sort - b.sort)) {
        if (l.sort === 0) {
          const c = db.categories.find((x) => x.id === l.categoryId);
          if (c) out[l.ideaId] = c.hue;
        }
      }
      return out;
    },
  };
}
