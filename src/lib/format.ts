const MIN = 60_000;
export function ago(iso: string, nowMs = Date.now()): string {
  const d = nowMs - new Date(iso).getTime();
  if (d < MIN) return 'agora';
  if (d < 60 * MIN) return `há ${Math.floor(d / MIN)} min`;
  if (d < 24 * 60 * MIN) return `há ${Math.floor(d / (60 * MIN))} h`;
  const days = Math.floor(d / (24 * 60 * MIN));
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}
export const STATUS_LABEL: Record<string, string> = { ideia: 'Ideia', explorando: 'Explorando', progresso: 'Em progresso', pronta: 'Pronta', arquivada: 'Arquivada' };
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
export function dueLabel(due: string | null, todayIso = new Date().toISOString().slice(0, 10)): { text: string; late: boolean } | null {
  if (!due) return null;
  const diff = Math.round((new Date(due + 'T12:00:00').getTime() - new Date(todayIso + 'T12:00:00').getTime()) / 86_400_000);
  const date = new Date(due + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  if (diff < 0) return { text: `venceu em ${date}`, late: true };
  if (diff === 0) return { text: 'vence hoje', late: false };
  if (diff === 1) return { text: 'vence amanhã', late: false };
  return { text: `vence em ${date}`, late: false };
}

/** Trecho do corpo para o cartão. O corpo pode ser texto puro ou o JSON do editor (fase 2). */
export function excerpt(doc: string, max = 130): string {
  let text = doc;
  try {
    const j = JSON.parse(doc);
    const parts: string[] = [];
    const plain = (n: { text?: string; content?: unknown[] }): string =>
      (n.text ?? '') + ((n.content as { text?: string; content?: unknown[] }[] | undefined)?.map(plain).join(' ') ?? '');
    // só texto corrido: pula títulos, imagens e blocos de código
    const walk = (n: { type?: string; content?: unknown[] }) => {
      if (n.type === 'paragraph' || n.type === 'listItem' || n.type === 'blockquote') parts.push(plain(n as { text?: string; content?: unknown[] }));
      else (n.content as { type?: string; content?: unknown[] }[] | undefined)?.forEach(walk);
    };
    walk(j);
    text = parts.map((x) => x.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ');
  } catch {
    /* texto puro */
  }
  text = text.replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1).trimEnd() + '…' : text;
}
