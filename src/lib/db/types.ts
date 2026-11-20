export type Status = 'ideia' | 'explorando' | 'progresso' | 'pronta' | 'arquivada';
export const STATUSES: Status[] = ['ideia', 'explorando', 'progresso', 'pronta', 'arquivada'];

export type TemplateId = 'jogo' | 'mod' | 'app' | 'freelance' | 'livre';

export interface Folder {
  id: string;
  name: string;
  hue: number;
  icon: string;
  template: TemplateId;
  sort: number;
  createdAt: string;
}

export interface Idea {
  id: string;
  folderId: string;
  title: string;
  doc: string;
  status: Status;
  due: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Topic {
  id: string;
  ideaId: string;
  title: string;
  done: boolean;
  sort: number;
}

export interface Category {
  id: string;
  name: string;
  group: string;
  hue: number;
}

export type NewFolder = { name: string; hue: number; icon?: string; template?: TemplateId };
export type IdeaPatch = Partial<Pick<Idea, 'title' | 'doc' | 'status' | 'due' | 'pinned' | 'folderId'>>;

/** Tudo o que o app precisa do armazenamento. SQLite (Tauri) e memória (navegador e testes) cumprem o mesmo contrato. */
export interface Repo {
  listFolders(): Promise<Folder[]>;
  createFolder(f: NewFolder): Promise<Folder>;
  updateFolder(id: string, patch: Partial<Pick<Folder, 'name' | 'hue' | 'icon'>>): Promise<void>;
  deleteFolder(id: string): Promise<void>;

  listIdeas(folderId?: string): Promise<Idea[]>;
  getIdea(id: string): Promise<Idea | null>;
  createIdea(input: { folderId: string; title: string }): Promise<Idea>;
  updateIdea(id: string, patch: IdeaPatch): Promise<void>;
  deleteIdea(id: string): Promise<void>;

  listTopics(ideaId: string): Promise<Topic[]>;
  addTopic(ideaId: string, title: string): Promise<Topic>;
  updateTopic(id: string, patch: Partial<Pick<Topic, 'title' | 'done'>>): Promise<void>;
  deleteTopic(id: string): Promise<void>;

  listCategories(): Promise<Category[]>;
  createCategory(c: Omit<Category, 'id'>): Promise<Category>;
  updateCategory(id: string, patch: Partial<Omit<Category, 'id'>>): Promise<void>;
  deleteCategory(id: string): Promise<void>;
  ideaCategories(ideaId: string): Promise<Category[]>;
  setIdeaCategories(ideaId: string, ids: string[]): Promise<void>;
  /** categoria principal de cada ideia (a primeira), para a cor da fita */
  primaryHues(): Promise<Record<string, number>>;
}
