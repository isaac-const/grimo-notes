import { useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEditorState, type Editor } from '@tiptap/react';

export const COLORS = [
  { id: 'red', label: 'Vermelho', fg: 'oklch(.7 .18 25)' },
  { id: 'orange', label: 'Laranja', fg: 'oklch(.75 .16 60)' },
  { id: 'yellow', label: 'Amarelo', fg: 'oklch(.82 .15 95)' },
  { id: 'green', label: 'Verde', fg: 'oklch(.74 .16 150)' },
  { id: 'blue', label: 'Azul', fg: 'oklch(.7 .15 250)' },
  { id: 'purple', label: 'Roxo', fg: 'oklch(.7 .17 300)' },
  { id: 'pink', label: 'Rosa', fg: 'oklch(.74 .16 350)' },
  { id: 'gray', label: 'Cinza', fg: 'oklch(.65 .02 90)' },
];
const hl = (fg: string) => `color-mix(in oklab, ${fg} 30%, transparent)`;

export const TURN: { label: string; active: (e: Editor) => boolean; run: (e: Editor) => void }[] = [
  { label: 'Texto', active: (e) => e.isActive('paragraph'), run: (e) => e.chain().focus().setParagraph().run() },
  { label: 'Título 1', active: (e) => e.isActive('heading', { level: 1 }), run: (e) => e.chain().focus().setHeading({ level: 1 }).run() },
  { label: 'Título 2', active: (e) => e.isActive('heading', { level: 2 }), run: (e) => e.chain().focus().setHeading({ level: 2 }).run() },
  { label: 'Título 3', active: (e) => e.isActive('heading', { level: 3 }), run: (e) => e.chain().focus().setHeading({ level: 3 }).run() },
  { label: 'Lista', active: (e) => e.isActive('bulletList'), run: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Lista numerada', active: (e) => e.isActive('orderedList'), run: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Tarefas', active: (e) => e.isActive('taskList'), run: (e) => e.chain().focus().toggleTaskList().run() },
  { label: 'Citação', active: (e) => e.isActive('blockquote'), run: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Código', active: (e) => e.isActive('codeBlock'), run: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: 'Destaque', active: (e) => e.isActive('callout'), run: (e) => e.chain().focus().setCallout('ideia').run() },
];

const SIZES = [['Pequeno', '14px'], ['Normal', ''], ['Grande', '21px'], ['Enorme', '28px']] as const;

const B = ({ on, label, title, run, children }: { on?: boolean; label?: string; title: string; run: () => void; children?: React.ReactNode }) => (
  <button type="button" title={title} aria-label={title} aria-pressed={on} onMouseDown={(e) => e.preventDefault()} onClick={run} className="h-8 min-w-8 rounded-lg px-2 text-sm text-muted hover:text-ink aria-pressed:bg-surface-2 aria-pressed:text-ink">
    {children ?? label}
  </button>
);

const Pop = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div role="menu" aria-label={label} className="absolute left-0 top-10 z-50 grid min-w-44 gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow)]" onMouseDown={(e) => e.preventDefault()}>
    {children}
  </div>
);
const Item = ({ on, run, children }: { on?: boolean; run: () => void; children: React.ReactNode }) => (
  <button type="button" role="menuitem" onClick={run} className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-surface-2 ${on ? 'font-semibold' : ''}`}>
    {children}
  </button>
);

/** Barra que aparece ao selecionar texto: tipo do bloco, estilo, cor, tamanho, alinhamento e link. */
export function SelectionMenu({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState<null | 'turn' | 'color' | 'size' | 'link'>(null);
  // o menu não é filho direto do editor: assina o estado para atualizar rótulos e botões ativos a cada mudança
  const st = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      turn: TURN.find((t) => t.active(e))?.label ?? 'Texto',
      bold: e.isActive('bold'), italic: e.isActive('italic'), underline: e.isActive('underline'), strike: e.isActive('strike'), code: e.isActive('code'), link: e.isActive('link'),
      color: (e.getAttributes('textStyle').color as string | undefined) ?? '',
      left: e.isActive({ textAlign: 'left' }), center: e.isActive({ textAlign: 'center' }), right: e.isActive({ textAlign: 'right' }),
    }),
  });
  const [href, setHref] = useState('');
  const toggle = (k: typeof open) => setOpen((o) => (o === k ? null : k));
  const current = st.turn;
  const close = () => setOpen(null);
  return (
    <BubbleMenu editor={editor} options={{ placement: 'top', offset: 10 }} shouldShow={({ editor: e, state }) => e.isEditable && !state.selection.empty && !e.isActive('image') && !e.isActive('drawing') && !e.isActive('embed')} className="relative flex items-center gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-[var(--shadow)]">
      <div className="relative">
        <button type="button" aria-haspopup="menu" aria-expanded={open === 'turn'} onMouseDown={(e) => e.preventDefault()} onClick={() => toggle('turn')} className="h-8 rounded-lg px-2.5 text-sm text-ink hover:bg-surface-2">{current} <span aria-hidden="true" className="text-muted">▾</span></button>
        {open === 'turn' && <Pop label="Transformar em">{TURN.map((t) => <Item key={t.label} on={t.active(editor)} run={() => (t.run(editor), close())}>{t.label}</Item>)}</Pop>}
      </div>
      <span className="mx-0.5 h-5 w-px bg-line" />
      <B title="Negrito" on={st.bold} run={() => editor.chain().focus().toggleBold().run()}><b>N</b></B>
      <B title="Itálico" on={st.italic} run={() => editor.chain().focus().toggleItalic().run()}><i>I</i></B>
      <B title="Sublinhado" on={st.underline} run={() => editor.chain().focus().toggleUnderline().run()}><u>S</u></B>
      <B title="Tachado" on={st.strike} run={() => editor.chain().focus().toggleStrike().run()}><s>T</s></B>
      <B title="Código" on={st.code} run={() => editor.chain().focus().toggleCode().run()}>{'</>'}</B>
      <div className="relative">
        <B title="Link" on={st.link} run={() => (setHref((editor.getAttributes('link').href as string) ?? ''), toggle('link'))}>Link</B>
        {open === 'link' && (
          <div className="absolute left-0 top-10 z-50 flex gap-1.5 rounded-xl border border-line bg-surface p-2 shadow-[var(--shadow)]">
            <input autoFocus value={href} onChange={(e) => setHref(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { const v = href.trim(); (v ? editor.chain().focus().setLink({ href: /^https?:\/\//i.test(v) ? v : `https://${v}` }).run() : editor.chain().focus().unsetLink().run()); close(); } if (e.key === 'Escape') close(); }} placeholder="Cole o endereço e aperte Enter" aria-label="Endereço do link" className="h-8 w-60 rounded-lg border border-line bg-bg px-2.5 text-sm outline-none focus:border-accent" />
            {st.link && <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => (editor.chain().focus().unsetLink().run(), close())} className="h-8 rounded-lg px-2 text-sm text-muted hover:text-ink">Remover</button>}
          </div>
        )}
      </div>
      <span className="mx-0.5 h-5 w-px bg-line" />
      <div className="relative">
        <B title="Cor do texto e do fundo" run={() => toggle('color')}><span className="font-bold" style={{ color: st.color || undefined, borderBottom: '2px solid currentColor' }}>A</span></B>
        {open === 'color' && (
          <Pop label="Cores">
            <span className="px-2.5 pt-1 text-[11px] uppercase tracking-wide text-muted">Texto</span>
            <div className="grid grid-cols-4 gap-1 px-1.5 pb-1">
              {COLORS.map((c) => <button key={c.id} type="button" aria-label={`Texto ${c.label}`} onClick={() => (editor.chain().focus().setColor(c.fg).run(), close())} className="grid h-8 w-8 place-items-center rounded-lg border border-line text-sm font-bold hover:border-ink" style={{ color: c.fg }}>A</button>)}
            </div>
            <span className="px-2.5 pt-1 text-[11px] uppercase tracking-wide text-muted">Fundo</span>
            <div className="grid grid-cols-4 gap-1 px-1.5 pb-1">
              {COLORS.map((c) => <button key={c.id} type="button" aria-label={`Fundo ${c.label}`} onClick={() => (editor.chain().focus().setHighlight({ color: hl(c.fg) }).run(), close())} className="h-8 w-8 rounded-lg border border-line hover:border-ink" style={{ background: hl(c.fg) }} />)}
            </div>
            <Item run={() => (editor.chain().focus().unsetColor().unsetHighlight().run(), close())}>Cor padrão</Item>
          </Pop>
        )}
      </div>
      <div className="relative">
        <B title="Tamanho do texto" run={() => toggle('size')}>Aa</B>
        {open === 'size' && (
          <Pop label="Tamanho">
            {SIZES.map(([l, v]) => <Item key={l} run={() => (v ? editor.chain().focus().setFontSize(v).run() : editor.chain().focus().unsetFontSize().run(), close())}><span style={{ fontSize: v || undefined }}>{l}</span></Item>)}
          </Pop>
        )}
      </div>
      <span className="mx-0.5 h-5 w-px bg-line" />
      {(['left', 'center', 'right'] as const).map((a) => (
        <B key={a} title={`Alinhar ${a === 'left' ? 'à esquerda' : a === 'center' ? 'ao centro' : 'à direita'}`} on={st[a]} run={() => editor.chain().focus().setTextAlign(a).run()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d={a === 'left' ? 'M4 6h16M4 12h10M4 18h14' : a === 'center' ? 'M4 6h16M7 12h10M5 18h14' : 'M4 6h16M10 12h10M6 18h14'} />
          </svg>
        </B>
      ))}
    </BubbleMenu>
  );
}
