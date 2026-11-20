import { useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { norm } from '../lib/search';

export interface SlashItem { id: string; group: 'Básico' | 'Mídia' | 'Avançado'; label: string; hint: string; keys: string[]; run: (e: Editor, ctx: SlashCtx) => void }
export interface SlashCtx { pickImage: () => void; askMedia: () => void }

const day = () => new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

export const SLASH_ITEMS: SlashItem[] = [
  { id: 'text', group: 'Básico', label: 'Texto', hint: 'Parágrafo comum', keys: ['text', 'plain', 'paragrafo', 'texto'], run: (e) => e.chain().focus().setParagraph().run() },
  { id: 'h1', group: 'Básico', label: 'Título 1', hint: 'Seção grande', keys: ['h1', '#', 'titulo', 'heading'], run: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { id: 'h2', group: 'Básico', label: 'Título 2', hint: 'Seção média', keys: ['h2', '##', 'subtitulo'], run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { id: 'h3', group: 'Básico', label: 'Título 3', hint: 'Seção pequena', keys: ['h3', '###'], run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { id: 'bullet', group: 'Básico', label: 'Lista', hint: 'Com marcadores', keys: ['bullet', 'lista', 'ul'], run: (e) => e.chain().focus().toggleBulletList().run() },
  { id: 'num', group: 'Básico', label: 'Lista numerada', hint: '1, 2, 3', keys: ['num', 'numerada', 'ol'], run: (e) => e.chain().focus().toggleOrderedList().run() },
  { id: 'todo', group: 'Básico', label: 'Tarefas', hint: 'Caixas de marcar', keys: ['todo', 'tarefa', 'checklist', 'check'], run: (e) => e.chain().focus().toggleTaskList().run() },
  { id: 'toggle', group: 'Básico', label: 'Lista recolhível', hint: 'Esconde o conteúdo', keys: ['toggle', 'recolhivel', 'detalhes'], run: (e) => e.chain().focus().setDetails().run() },
  { id: 'quote', group: 'Básico', label: 'Citação', hint: 'Trecho destacado', keys: ['quote', 'citacao'], run: (e) => e.chain().focus().toggleBlockquote().run() },
  { id: 'callout', group: 'Básico', label: 'Destaque', hint: 'Caixa com ícone', keys: ['callout', 'destaque', 'aviso', 'nota'], run: (e) => e.chain().focus().setCallout('ideia').run() },
  { id: 'div', group: 'Básico', label: 'Divisor', hint: 'Linha horizontal', keys: ['div', 'divisor', 'linha', 'hr'], run: (e) => e.chain().focus().setHorizontalRule().run() },
  { id: 'image', group: 'Mídia', label: 'Imagem', hint: 'Escolher do computador', keys: ['image', 'imagem', 'foto'], run: (_, c) => c.pickImage() },
  { id: 'video', group: 'Mídia', label: 'Vídeo ou áudio', hint: 'YouTube, Vimeo ou arquivo', keys: ['video', 'audio', 'youtube', 'vimeo'], run: (_, c) => c.askMedia() },
  { id: 'bookmark', group: 'Mídia', label: 'Link com cartão', hint: 'Endereço de um site', keys: ['book', 'bookmark', 'link', 'site'], run: (_, c) => c.askMedia() },
  { id: 'draw', group: 'Mídia', label: 'Desenho', hint: 'Rascunho livre', keys: ['draw', 'desenho', 'rascunho', 'sketch'], run: (e) => e.chain().focus().insertDrawing().run() },
  { id: 'code', group: 'Avançado', label: 'Código', hint: 'Bloco de código', keys: ['code', 'codigo'], run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { id: 'table', group: 'Avançado', label: 'Tabela', hint: '3 por 3, com cabeçalho', keys: ['table', 'tabela'], run: (e) => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { id: 'date', group: 'Avançado', label: 'Data de hoje', hint: day(), keys: ['date', 'data', 'hoje'], run: (e) => e.chain().focus().insertContent(day()).run() },
  { id: 'duplicate', group: 'Avançado', label: 'Duplicar bloco', hint: 'Copia o bloco atual', keys: ['duplicate', 'duplicar'], run: (e) => { const { $from } = e.state.selection; const n = $from.node($from.depth > 0 ? 1 : 0); const end = $from.after(1); e.chain().focus().insertContentAt(end, n.toJSON()).run(); } },
  { id: 'delete', group: 'Avançado', label: 'Apagar bloco', hint: 'Remove o bloco atual', keys: ['delete', 'apagar', 'remover'], run: (e) => e.chain().focus().deleteNode(e.state.selection.$from.parent.type.name).run() },
];

export const filterSlash = (q: string) => {
  const w = norm(q.trim());
  return SLASH_ITEMS.filter((i) => !w || norm(i.label).includes(w) || i.keys.some((k) => norm(k).startsWith(w) || (w.length > 2 && norm(k).includes(w))));
};

const TRIGGER = /(?:^|\s)\/([^\s/]*)$/;

/** Menu `/`: abre ao digitar "/" no começo de uma linha ou depois de um espaço, filtra pelo que vem depois e fecha com Esc. */
export function SlashMenu({ editor, ctx }: { editor: Editor; ctx: SlashCtx }) {
  const [state, setState] = useState<{ q: string; x: number; y: number; from: number } | null>(null);
  const [sel, setSel] = useState(0);

  useEffect(() => {
    const check = () => {
      const { $from, empty } = editor.state.selection;
      if (!empty || !$from.parent.isTextblock || $from.parent.type.name === 'codeBlock') return setState(null);
      const before = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
      const m = TRIGGER.exec(before);
      if (!m) return setState(null);
      const c = editor.view.coordsAtPos($from.pos);
      setState({ q: m[1], x: c.left, y: c.bottom + 8, from: $from.pos - m[1].length - 1 });
    };
    editor.on('update', check);
    editor.on('selectionUpdate', check);
    return () => {
      editor.off('update', check);
      editor.off('selectionUpdate', check);
    };
  }, [editor]);

  const items = useMemo(() => (state ? filterSlash(state.q) : []), [state]);
  useEffect(() => setSel(0), [state?.q]);

  const run = (i: SlashItem) => {
    if (!state) return;
    editor.chain().focus().deleteRange({ from: state.from, to: editor.state.selection.to }).run();
    i.run(editor, ctx);
    setState(null);
  };

  useEffect(() => {
    if (!state || !items.length) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') (e.preventDefault(), e.stopPropagation(), setSel((s) => (s + 1) % items.length));
      else if (e.key === 'ArrowUp') (e.preventDefault(), e.stopPropagation(), setSel((s) => (s - 1 + items.length) % items.length));
      else if (e.key === 'Enter') (e.preventDefault(), e.stopPropagation(), run(items[sel]));
      else if (e.key === 'Escape') (e.stopPropagation(), setState(null));
    };
    addEventListener('keydown', onKey, true);
    return () => removeEventListener('keydown', onKey, true);
  });

  useEffect(() => {
    document.querySelector('[role="option"][aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [sel]);

  if (!state || !items.length) return null;
  const top = Math.min(state.y, innerHeight - 340);
  return (
    <div role="listbox" aria-label="Inserir bloco" className="fixed z-40 max-h-[320px] w-72 overflow-y-auto rounded-2xl border border-line bg-surface p-1.5 shadow-[var(--shadow)]" style={{ left: Math.min(state.x, innerWidth - 300), top: state.y > innerHeight - 340 ? Math.max(8, state.y - 340) : top }}>
      {items.map((i, n) => (
        <div key={i.id}>
          {(n === 0 || items[n - 1].group !== i.group) && <div className="px-3 pb-1 pt-2 font-mono text-[10.5px] uppercase tracking-[.08em] text-muted">{i.group}</div>}
          <button type="button" role="option" aria-selected={n === sel} onMouseDown={(e) => (e.preventDefault(), run(i))} onMouseEnter={() => setSel(n)} className="flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-1.5 text-left text-sm aria-selected:bg-surface-2">
            <span>{i.label}</span>
            <span className="truncate text-xs text-muted">{i.hint}</span>
          </button>
        </div>
      ))}
    </div>
  );
}
