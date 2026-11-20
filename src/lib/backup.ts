import { docToMarkdown } from './markdown';
import { STATUSES, type Repo, type Status, type TemplateId } from './db/types';
import { STATUS_LABEL } from './format';

export interface Snapshot {
  app: 'grimo-notes';
  version: 1;
  exportedAt: string;
  folders: { id: string; name: string; hue: number; icon: string; template: TemplateId }[];
  categories: { id: string; name: string; group: string; hue: number }[];
  ideas: { id: string; folderId: string; title: string; doc: string; status: Status; due: string | null; pinned: boolean; createdAt: string; updatedAt: string; topics: { title: string; done: boolean }[]; categories: string[] }[];
}

export async function makeSnapshot(repo: Repo): Promise<Snapshot> {
  const [folders, categories, ideas] = await Promise.all([repo.listFolders(), repo.listCategories(), repo.listIdeas()]);
  const full = [];
  for (const i of ideas) {
    const [topics, cats] = await Promise.all([repo.listTopics(i.id), repo.ideaCategories(i.id)]);
    full.push({ ...i, topics: topics.map((t) => ({ title: t.title, done: t.done })), categories: cats.map((c) => c.id) });
  }
  return {
    app: 'grimo-notes',
    version: 1,
    exportedAt: new Date().toISOString(),
    folders: folders.map(({ id, name, hue, icon, template }) => ({ id, name, hue, icon, template })),
    categories,
    ideas: full,
  };
}

/** Confere o formato do arquivo antes de importar. Devolve o snapshot ou o motivo da recusa. */
export function parseSnapshot(text: string): { ok: true; snap: Snapshot } | { ok: false; error: string } {
  let j: unknown;
  try {
    j = JSON.parse(text);
  } catch {
    return { ok: false, error: 'O arquivo não é um JSON válido.' };
  }
  const s = j as Partial<Snapshot>;
  if (!s || s.app !== 'grimo-notes' || s.version !== 1) return { ok: false, error: 'Esse arquivo não é um backup do Grimo Notes.' };
  if (!Array.isArray(s.folders) || !Array.isArray(s.ideas) || !Array.isArray(s.categories)) return { ok: false, error: 'O backup está incompleto.' };
  for (const f of s.folders) if (typeof f?.id !== 'string' || typeof f.name !== 'string') return { ok: false, error: 'Uma das pastas do backup está inválida.' };
  for (const i of s.ideas) {
    if (typeof i?.id !== 'string' || typeof i.folderId !== 'string' || typeof i.title !== 'string' || !STATUSES.includes(i.status)) return { ok: false, error: 'Uma das ideias do backup está inválida.' };
  }
  return { ok: true, snap: s as Snapshot };
}

/** Importa como pastas e ideias novas. Nada existente é alterado, e categorias iguais (mesmo nome e grupo) são reaproveitadas. */
export async function importSnapshot(repo: Repo, snap: Snapshot): Promise<{ folders: number; ideas: number }> {
  const existing = await repo.listCategories();
  const catMap = new Map<string, string>();
  for (const c of snap.categories) {
    const hit = existing.find((e) => e.name === c.name && e.group === c.group) ?? (await repo.createCategory({ name: c.name, group: c.group, hue: c.hue }));
    if (!existing.includes(hit)) existing.push(hit);
    catMap.set(c.id, hit.id);
  }
  const folderMap = new Map<string, string>();
  for (const f of snap.folders) folderMap.set(f.id, (await repo.createFolder({ name: f.name, hue: f.hue, icon: f.icon, template: f.template })).id);
  let n = 0;
  for (const i of [...snap.ideas].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))) {
    const folderId = folderMap.get(i.folderId);
    if (!folderId) continue;
    const created = await repo.createIdea({ folderId, title: i.title });
    for (const t of await repo.listTopics(created.id)) await repo.deleteTopic(t.id); // o modelo da pasta criou tópicos de partida; o backup traz os verdadeiros
    for (const t of i.topics ?? []) {
      const nt = await repo.addTopic(created.id, t.title);
      if (t.done) await repo.updateTopic(nt.id, { done: true });
    }
    await repo.updateIdea(created.id, { doc: i.doc, status: i.status, due: i.due, pinned: !!i.pinned });
    await repo.setIdeaCategories(created.id, (i.categories ?? []).map((c) => catMap.get(c)).filter((x): x is string => !!x));
    n++;
  }
  return { folders: snap.folders.length, ideas: n };
}

/** Um arquivo Markdown só, com as pastas como seções e cada ideia com suas propriedades, tópicos e texto. */
export async function makeMarkdown(repo: Repo): Promise<string> {
  const snap = await makeSnapshot(repo);
  const cat = new Map(snap.categories.map((c) => [c.id, c.name]));
  const out = [`# Grimo Notes`, '', `Exportado em ${new Date(snap.exportedAt).toLocaleDateString('pt-BR')}.`];
  for (const f of snap.folders) {
    out.push('', `## ${f.name}`);
    for (const i of snap.ideas.filter((x) => x.folderId === f.id)) {
      out.push('', `### ${i.title}`, '');
      const meta = [`Status: ${STATUS_LABEL[i.status]}`, i.due ? `Prazo: ${i.due}` : '', i.pinned ? 'Fixada' : '', i.categories.length ? `Categorias: ${i.categories.map((c) => cat.get(c) ?? '').filter(Boolean).join(', ')}` : ''].filter(Boolean);
      out.push(meta.join(' · '));
      if (i.topics.length) out.push('', ...i.topics.map((t) => `- [${t.done ? 'x' : ' '}] ${t.title}`));
      const body = docToMarkdown(i.doc);
      if (body) out.push('', body.replace(/^(#{1,6}) /gm, (_, h: string) => `${'#'.repeat(Math.min(6, h.length + 3))} `));
    }
  }
  return out.join('\n') + '\n';
}
