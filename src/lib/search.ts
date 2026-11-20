import { docText } from './docs';
import { excerpt } from './format';
import type { Folder, Idea, Topic } from './db/types';

export const norm = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export interface Hit { idea: Idea; score: number; snippet: string }

/** Todas as palavras precisam aparecer. Título pesa mais que corpo, e corpo mais que nome da pasta. Ignora acento e maiúscula. */
export function searchIdeas(ideas: Idea[], folders: Folder[], q: string, topics: Topic[] = []): Hit[] {
  const words = norm(q).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const folderName = new Map(folders.map((f) => [f.id, norm(f.name)]));
  const topicText = new Map<string, string>();
  for (const t of topics) topicText.set(t.ideaId, (topicText.get(t.ideaId) ?? '') + ' ' + norm(t.title));
  const hits: Hit[] = [];
  for (const idea of ideas) {
    const title = norm(idea.title);
    const raw = docText(idea.doc);
    const body = norm(raw);
    const where = folderName.get(idea.folderId) ?? '';
    const tp = topicText.get(idea.id) ?? '';
    let score = 0;
    let ok = true;
    for (const w of words) {
      let s = 0;
      if (title.startsWith(w)) s = 12;
      else if (title.includes(w)) s = 8;
      else if (body.includes(w)) s = 4;
      else if (tp.includes(w)) s = 3;
      else if (where.includes(w)) s = 2;
      if (!s) {
        ok = false;
        break;
      }
      score += s;
    }
    if (!ok) continue;
    const i = body.indexOf(words[0]);
    const snippet = title.includes(words[0]) ? excerpt(idea.doc, 110) : i < 0 ? '' : (i > 30 ? '…' : '') + raw.replace(/\s+/g, ' ').slice(Math.max(0, i - 30), i + 90).trim() + (raw.length > i + 90 ? '…' : '');
    hits.push({ idea, score, snippet });
  }
  return hits.sort((a, b) => b.score - a.score || b.idea.updatedAt.localeCompare(a.idea.updatedAt));
}
