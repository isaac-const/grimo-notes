import { create } from 'zustand';
import { getRepo } from './db';
import type { Category, Folder, Idea, IdeaPatch, NewFolder } from './db/types';
import { DEMO_KEY, loadDemo } from '../demo/seed';
import { applyPrefs, loadPrefs, savePrefs, type Prefs } from './prefs';

export type Route = { name: 'home' } | { name: 'gallery' } | { name: 'settings' } | { name: 'folder'; id: string } | { name: 'idea'; id: string };
export type ViewMode = 'cards' | 'list' | 'kanban' | 'calendar';

const parseHash = (): Route => {
  const m = location.hash.replace(/^#\/?/, '').split('/');
  if (m[0] === 'galeria') return { name: 'gallery' };
  if (m[0] === 'configuracoes') return { name: 'settings' };
  if (m[0] === 'pasta' && m[1]) return { name: 'folder', id: m[1] };
  if (m[0] === 'ideia' && m[1]) return { name: 'idea', id: m[1] };
  return { name: 'home' };
};
export const hashOf = (r: Route) => (r.name === 'home' ? '#/' : r.name === 'gallery' ? '#/galeria' : r.name === 'settings' ? '#/configuracoes' : r.name === 'folder' ? `#/pasta/${r.id}` : `#/ideia/${r.id}`);

const read = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
};
const write = (k: string, v: unknown) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sem armazenamento */
  }
};

interface State {
  ready: boolean;
  folders: Folder[];
  ideas: Idea[];
  categories: Category[];
  hues: Record<string, number>;
  route: Route;
  view: ViewMode;
  collapsed: boolean;
  palette: boolean;
  setPalette(v: boolean): void;
  load(): Promise<void>;
  go(r: Route): void;
  setView(v: ViewMode): void;
  toggleSidebar(): void;
  addFolder(f: NewFolder): Promise<Folder>;
  editFolder(id: string, patch: { name?: string; hue?: number }): Promise<void>;
  removeFolder(id: string): Promise<void>;
  addIdea(folderId: string, title: string): Promise<Idea>;
  patchIdea(id: string, patch: IdeaPatch): Promise<void>;
  removeIdea(id: string): Promise<void>;
  refreshHues(): Promise<void>;
  demoIds: string[];
  prefs: Prefs;
  setPrefs(p: Partial<Prefs>): void;
  reloadAll(): Promise<void>;
  loadExample(): Promise<void>;
  removeExample(): Promise<void>;
}

export const useApp = create<State>((set, get) => ({
  ready: false,
  folders: [],
  ideas: [],
  categories: [],
  hues: {},
  route: parseHash(),
  view: read<ViewMode>('grimo-view', loadPrefs().defaultView),
  prefs: loadPrefs(),
  setPrefs(p) {
    const prefs = { ...get().prefs, ...p };
    savePrefs(prefs);
    applyPrefs(prefs);
    set({ prefs });
  },
  async reloadAll() {
    await get().load();
  },
  collapsed: read<boolean>('grimo-collapsed', false),
  palette: false,
  demoIds: read<string[]>(DEMO_KEY, []),
  setPalette: (palette) => set({ palette }),

  async load() {
    const r = await getRepo();
    const [folders, ideas, categories, hues] = await Promise.all([r.listFolders(), r.listIdeas(), r.listCategories(), r.primaryHues()]);
    set({ folders, ideas, categories, hues, ready: true });
  },
  go(route) {
    const h = hashOf(route);
    if (location.hash !== h) history.pushState(null, '', h);
    set({ route });
  },
  setView(view) {
    write('grimo-view', view);
    set({ view });
  },
  toggleSidebar() {
    const collapsed = !get().collapsed;
    write('grimo-collapsed', collapsed);
    set({ collapsed });
  },
  async addFolder(f) {
    const r = await getRepo();
    const folder = await r.createFolder(f);
    set({ folders: [...get().folders, folder] });
    return folder;
  },
  async editFolder(id, patch) {
    const r = await getRepo();
    await r.updateFolder(id, patch);
    set({ folders: get().folders.map((f) => (f.id === id ? { ...f, ...patch } : f)) });
  },
  async removeFolder(id) {
    const r = await getRepo();
    await r.deleteFolder(id);
    set({ folders: get().folders.filter((f) => f.id !== id), ideas: get().ideas.filter((i) => i.folderId !== id) });
    const cur = get().route;
    if (cur.name === 'folder' && cur.id === id) get().go({ name: 'home' });
  },
  async addIdea(folderId, title) {
    const r = await getRepo();
    const idea = await r.createIdea({ folderId, title });
    set({ ideas: [idea, ...get().ideas] });
    return idea;
  },
  async patchIdea(id, patch) {
    const r = await getRepo();
    await r.updateIdea(id, patch);
    const updatedAt = new Date().toISOString();
    set({ ideas: get().ideas.map((i) => (i.id === id ? { ...i, ...patch, updatedAt } : i)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) });
  },
  async removeIdea(id) {
    const r = await getRepo();
    await r.deleteIdea(id);
    set({ ideas: get().ideas.filter((i) => i.id !== id) });
  },
  async loadExample() {
    const ids = await loadDemo(await getRepo());
    write(DEMO_KEY, ids);
    set({ demoIds: ids });
    await get().load();
  },
  async removeExample() {
    for (const id of get().demoIds) await get().removeFolder(id);
    write(DEMO_KEY, []);
    set({ demoIds: [] });
  },
  async refreshHues() {
    const r = await getRepo();
    set({ hues: await r.primaryHues() });
  },
}));

addEventListener('popstate', () => useApp.setState({ route: parseHash() }));
