import { useCallback, useState } from 'react';
import DragHandle from '@tiptap/extension-drag-handle-react';
import type { Editor } from '@tiptap/react';
import type { Node } from '@tiptap/pm/model';
import { TURN } from './SelectionMenu';

// precisa ser estável: se mudar a cada renderização, o plugin da alça é recriado e ela some
const POSITION = { placement: 'left-start', strategy: 'absolute' } as const;

/** Alça à esquerda de cada bloco: "+" insere um bloco novo abaixo e abre o menu `/`; a grade arrasta e abre o menu do bloco. */
export function BlockHandle({ editor }: { editor: Editor }) {
  const [cur, setCur] = useState<{ node: Node | null; pos: number }>({ node: null, pos: -1 });
  const [menu, setMenu] = useState(false);
  const onNodeChange = useCallback(({ node, pos }: { node: Node | null; pos: number }) => {
    setCur({ node, pos });
    setMenu(false);
  }, []);

  const addBelow = () => {
    if (!cur.node) return;
    const at = cur.pos + cur.node.nodeSize;
    editor.chain().focus().insertContentAt(at, { type: 'paragraph' }).setTextSelection(at + 1).insertContent('/').run();
  };
  const turn = (run: (e: Editor) => void) => {
    editor.chain().focus().setTextSelection(cur.pos + 1).run();
    run(editor);
    setMenu(false);
  };
  const duplicate = () => {
    if (cur.node) editor.chain().focus().insertContentAt(cur.pos + cur.node.nodeSize, cur.node.toJSON()).run();
    setMenu(false);
  };
  const remove = () => {
    if (cur.node) editor.chain().focus().deleteRange({ from: cur.pos, to: cur.pos + cur.node.nodeSize }).run();
    setMenu(false);
  };

  return (
    <DragHandle editor={editor} onNodeChange={onNodeChange} computePositionConfig={POSITION}>
      <div className="relative flex items-center gap-0.5 pr-1">
        <button type="button" aria-label="Inserir bloco abaixo" title="Inserir bloco abaixo" onClick={addBelow} className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button type="button" aria-label="Arrastar ou abrir menu do bloco" title="Arraste para mover. Clique para opções." onClick={() => setMenu(!menu)} className="grid h-6 w-5 cursor-grab place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink">
          <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">{[3, 8, 13].map((y) => [3, 9].map((x) => <circle key={`${x}${y}`} cx={x} cy={y} r="1.3" />))}</svg>
        </button>
        {menu && (
          <div role="menu" aria-label="Opções do bloco" className="absolute left-0 top-8 z-50 grid min-w-48 gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-[var(--shadow)]">
            <span className="px-2.5 pt-1 text-[11px] uppercase tracking-wide text-muted">Transformar em</span>
            {TURN.slice(0, 7).map((t) => <button key={t.label} type="button" role="menuitem" onClick={() => turn(t.run)} className="rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-surface-2">{t.label}</button>)}
            <div className="my-1 h-px bg-line" />
            <button type="button" role="menuitem" onClick={duplicate} className="rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-surface-2">Duplicar</button>
            <button type="button" role="menuitem" onClick={remove} className="rounded-lg px-2.5 py-1.5 text-left text-sm text-[oklch(.68_.17_25)] hover:bg-surface-2">Apagar</button>
          </div>
        )}
      </div>
    </DragHandle>
  );
}
