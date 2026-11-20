import { useEffect, useRef, useState } from 'react';
import Image from '@tiptap/extension-image';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { resolveSrc } from './images';

export type Layout = 'inline' | 'wide' | 'half' | 'third' | 'left' | 'right' | 'margin';
export const LAYOUTS: { id: Layout; label: string; hint: string }[] = [
  { id: 'inline', label: 'Em linha', hint: 'Centralizada, com largura ajustável' },
  { id: 'wide', label: 'Larga', hint: 'Passa um pouco da coluna do texto' },
  { id: 'half', label: 'Metade', hint: 'Duas lado a lado' },
  { id: 'third', label: 'Terço', hint: 'Três lado a lado' },
  { id: 'left', label: 'Esquerda', hint: 'Texto contorna pela direita' },
  { id: 'right', label: 'Direita', hint: 'Texto contorna pela esquerda' },
  { id: 'margin', label: 'Margem', hint: 'Fica na margem, junto do parágrafo' },
];
const RESIZABLE: Layout[] = ['inline', 'left', 'right'];

function ImageView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { src, caption, layout, width } = node.attrs as { src: string; caption: string; layout: Layout; width: number };
  const [url, setUrl] = useState<string>(src.startsWith('img:') ? '' : src);
  const box = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  // o posicionamento vale para o elemento externo que o editor cria, então ele recebe a posição e a largura
  useEffect(() => {
    const outer = wrap.current?.parentElement;
    if (!outer) return;
    outer.dataset.layout = layout;
    outer.style.setProperty('--w', String(width));
  }, [layout, width]);
  useEffect(() => {
    let alive = true;
    resolveSrc(src).then((u) => alive && setUrl(u));
    return () => void (alive = false);
  }, [src]);

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault();
    const parent = box.current?.closest('.ProseMirror') as HTMLElement | null;
    const total = parent?.clientWidth ?? 700;
    const startX = e.clientX;
    const start = width;
    const move = (m: PointerEvent) => updateAttributes({ width: Math.round(Math.max(15, Math.min(100, start + ((m.clientX - startX) / total) * 100 * (layout === 'right' ? -1 : 1)))) });
    const up = () => (removeEventListener('pointermove', move), removeEventListener('pointerup', up));
    addEventListener('pointermove', move);
    addEventListener('pointerup', up);
  };

  return (
    <NodeViewWrapper ref={wrap} className={`img-node${selected ? ' is-selected' : ''}`}>
      <div ref={box} className="img-frame">
        {url && <img src={url} alt={caption || ''} draggable={false} onDoubleClick={() => setZoom(true)} />}
        {selected && RESIZABLE.includes(layout) && <span className="img-handle" onPointerDown={startResize} role="separator" aria-label="Redimensionar imagem" style={layout === 'right' ? { left: -6, right: 'auto' } : undefined} />}
        {selected && (
          <div className="img-bar" contentEditable={false} role="toolbar" aria-label="Posição da imagem">
            {LAYOUTS.map((l) => (
              <button key={l.id} type="button" title={l.hint} aria-pressed={layout === l.id} onMouseDown={(e) => e.preventDefault()} onClick={() => updateAttributes({ layout: l.id, width: (l.id === 'left' || l.id === 'right') && width > 60 ? 40 : width })}>
                {l.label}
              </button>
            ))}
            <button type="button" className="img-del" aria-label="Remover imagem" onMouseDown={(e) => e.preventDefault()} onClick={() => deleteNode()}>
              Remover
            </button>
          </div>
        )}
      </div>
      <input className="img-cap" value={caption} onChange={(e) => updateAttributes({ caption: e.target.value })} placeholder="Legenda (opcional)" aria-label="Legenda da imagem" contentEditable={false} />
      {zoom && (
        <div className="img-zoom" onClick={() => setZoom(false)} role="dialog" aria-label="Imagem ampliada">
          <img src={url} alt={caption} />
        </div>
      )}
    </NodeViewWrapper>
  );
}

export const GrimoImage = Image.extend({
  draggable: true,
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: { default: '' },
      layout: { default: 'inline' },
      width: { default: 100 },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageView);
  },
}).configure({ inline: false, allowBase64: true });
