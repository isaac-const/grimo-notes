import { useEffect, useRef, useState } from 'react';
import { EditorContent, useEditor, type Editor as TEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TextStyle, Color, FontSize } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import { GrimoImage } from './ImageNode';
import { Callout } from './Callout';
import { Drawing } from './DrawingNode';
import { Embed, parseMedia } from './Embed';
import { SlashMenu } from './SlashMenu';
import { SelectionMenu } from './SelectionMenu';
import { BlockHandle } from './BlockHandle';
import { Modal } from '../components/Modal';
import { storeImage } from './images';

/** O corpo antigo era texto puro. Se não for JSON do editor, vira parágrafos. */
export function parseDoc(doc: string): object | string {
  if (!doc) return '';
  try {
    const j = JSON.parse(doc);
    if (j && j.type === 'doc') return j;
  } catch {
    /* texto puro */
  }
  return { type: 'doc', content: doc.split(/\n{2,}/).map((p) => ({ type: 'paragraph', content: p ? [{ type: 'text', text: p }] : [] })) };
}

const imageFiles = (dt: DataTransfer | null) => [...(dt?.files ?? [])].filter((f) => f.type.startsWith('image/'));

async function insertImages(editor: TEditor, files: File[], pos?: number) {
  let at = pos;
  for (const f of files) {
    let src: string;
    try {
      src = await storeImage(f);
    } catch {
      continue; // arquivo que não é imagem válida: ignora
    }
    const node = { type: 'image', attrs: { src, alt: f.name } };
    if (at === undefined) editor.chain().focus().insertContent(node).run();
    else (editor.chain().focus().insertContentAt(at, node).run(), (at += 1));
  }
}

const PLACEHOLDERS: Record<string, string> = { heading: 'Título', paragraph: 'Digite “/” para inserir blocos' };

function TableBar({ editor }: { editor: TEditor }) {
  if (!editor.isActive('table')) return null;
  const b = (label: string, run: () => void, danger = false) => (
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={run} className={`h-8 rounded-lg px-2.5 text-sm hover:bg-surface-2 ${danger ? 'text-[oklch(.68_.17_25)]' : 'text-muted hover:text-ink'}`}>{label}</button>
  );
  return (
    <div role="toolbar" aria-label="Tabela" className="mb-3 flex flex-wrap items-center gap-0.5 rounded-xl border border-line bg-surface p-1">
      {b('+ Linha', () => editor.chain().focus().addRowAfter().run())}
      {b('+ Coluna', () => editor.chain().focus().addColumnAfter().run())}
      {b('− Linha', () => editor.chain().focus().deleteRow().run())}
      {b('− Coluna', () => editor.chain().focus().deleteColumn().run())}
      {b('Apagar tabela', () => editor.chain().focus().deleteTable().run(), true)}
    </div>
  );
}

export function RichEditor({ doc, onChange }: { doc: string; onChange: (json: string) => void }) {
  const file = useRef<HTMLInputElement>(null);
  const editorRef = useRef<TEditor | null>(null);
  const [ask, setAsk] = useState(false);
  const [url, setUrl] = useState('');
  const [bad, setBad] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } } }),
      Placeholder.configure({ placeholder: ({ node }) => PLACEHOLDERS[node.type.name] ?? '' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TextStyle,
      Color,
      FontSize,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Details.configure({ persist: true }),
      DetailsSummary,
      DetailsContent,
      Callout,
      Drawing,
      Embed,
      GrimoImage,
    ],
    content: parseDoc(doc),
    editorProps: {
      attributes: { class: 'grimo-doc', 'aria-label': 'Anotações', role: 'textbox', 'aria-multiline': 'true' },
      handlePaste(_view, e) {
        const files = imageFiles(e.clipboardData);
        if (!files.length) return false;
        e.preventDefault();
        void insertImages(editorRef.current!, files);
        return true;
      },
      handleDrop(view, e) {
        const files = imageFiles((e as DragEvent).dataTransfer);
        if (!files.length) return false;
        e.preventDefault();
        const pos = view.posAtCoords({ left: (e as DragEvent).clientX, top: (e as DragEvent).clientY })?.pos;
        void insertImages(editorRef.current!, files, pos);
        return true;
      },
    },
    onUpdate: ({ editor }) => onChange(JSON.stringify(editor.getJSON())),
  });
  editorRef.current = editor;
  useEffect(() => () => editor?.destroy(), [editor]);
  if (!editor) return null;

  const submit = () => {
    if (editor.chain().focus().insertMedia(url).run()) (setAsk(false), setUrl(''), setBad(false));
    else setBad(true);
  };
  return (
    <div className="grimo-editor">
      <TableBar editor={editor} />
      <SelectionMenu editor={editor} />
      <BlockHandle editor={editor} />
      <SlashMenu editor={editor} ctx={{ pickImage: () => file.current?.click(), askMedia: () => setAsk(true) }} />
      <input id="grimo-pick-image" ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { void insertImages(editor, [...(e.target.files ?? [])]); e.target.value = ''; }} />
      <EditorContent editor={editor} />
      <Modal open={ask} onClose={() => (setAsk(false), setBad(false))} title="Inserir mídia ou link" width={480}>
        <form onSubmit={(e) => (e.preventDefault(), submit())} className="grid gap-4">
          <h2 className="font-display text-2xl font-bold">Vídeo, áudio ou link</h2>
          <label className="grid gap-1.5 text-sm text-muted">
            Endereço
            <input data-autofocus value={url} onChange={(e) => (setUrl(e.target.value), setBad(false))} placeholder="YouTube, Vimeo, arquivo .mp4 ou qualquer site" aria-invalid={bad} className="h-11 rounded-xl border border-line bg-bg px-3.5 text-base text-ink outline-none focus:border-accent" />
          </label>
          {bad && <p role="alert" className="text-sm text-[oklch(.68_.17_25)]">Esse endereço não parece válido.</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAsk(false)} className="h-10 rounded-full px-4 text-sm text-muted hover:text-ink">Cancelar</button>
            <button type="submit" disabled={!url.trim()} className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-40">Inserir</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export { parseMedia };
