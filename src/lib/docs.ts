/** Leitura do documento do editor (JSON do TipTap) sem depender do editor. */
interface N { type?: string; text?: string; attrs?: Record<string, unknown>; content?: N[] }

function root(doc: string): N | null {
  try {
    const j = JSON.parse(doc) as N;
    return j && j.type === 'doc' ? j : null;
  } catch {
    return null;
  }
}

export function docText(doc: string): string {
  const r = root(doc);
  if (!r) return doc;
  const parts: string[] = [];
  const walk = (n: N) => {
    if (n.text) parts.push(n.text);
    if (n.type === 'image' && n.attrs?.caption) parts.push(String(n.attrs.caption));
    n.content?.forEach((c) => (walk(c), c.type && c.type !== 'text' && parts.push('\n')));
  };
  walk(r);
  return parts.join(' ').replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').trim();
}

export interface DocImage { src: string; caption: string; layout: string }
export function docImages(doc: string): DocImage[] {
  const r = root(doc);
  if (!r) return [];
  const out: DocImage[] = [];
  const walk = (n: N) => {
    if (n.type === 'image' && n.attrs?.src) out.push({ src: String(n.attrs.src), caption: String(n.attrs.caption ?? ''), layout: String(n.attrs.layout ?? 'inline') });
    n.content?.forEach(walk);
  };
  walk(r);
  return out;
}

export interface DocDrawing { strokes: { c: string; w: number; p: [number, number][] }[]; height: number }
export function docDrawings(doc: string): DocDrawing[] {
  const r = root(doc);
  if (!r) return [];
  const out: DocDrawing[] = [];
  const walk = (n: N) => {
    if (n.type === 'drawing' && Array.isArray(n.attrs?.strokes) && (n.attrs!.strokes as unknown[]).length) out.push({ strokes: n.attrs!.strokes as DocDrawing['strokes'], height: Number(n.attrs?.height ?? 320) });
    n.content?.forEach(walk);
  };
  walk(r);
  return out;
}
