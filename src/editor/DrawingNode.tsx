import { useRef, useState } from 'react';
import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';

export interface Stroke { c: string; w: number; p: [number, number][] }
export const W = 800;
const COLORS = ['var(--ink)', '#ff6b4a', '#f2b632', '#3ec28f', '#4f8dff', '#b07cff'];
const SIZES = [2, 4, 8];

/** Pontos viram uma curva suave passando pelos pontos médios. */
export function pathOf(p: [number, number][]): string {
  if (p.length === 0) return '';
  if (p.length === 1) return `M${p[0][0]} ${p[0][1]}l.01 0`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) d += `Q${p[i][0]} ${p[i][1]} ${(p[i][0] + p[i + 1][0]) / 2} ${(p[i][1] + p[i + 1][1]) / 2}`;
  const l = p[p.length - 1];
  return d + `L${l[0]} ${l[1]}`;
}

/** Apaga os traços que passam perto do ponto. */
export function eraseAt(strokes: Stroke[], x: number, y: number, r = 14): Stroke[] {
  return strokes.filter((s) => !s.p.some(([px, py]) => Math.hypot(px - x, py - y) <= r + s.w / 2));
}

function DrawingView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const strokes = (node.attrs.strokes as Stroke[]) ?? [];
  const height = (node.attrs.height as number) ?? 320;
  const [editing, setEditing] = useState(strokes.length === 0);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [color, setColor] = useState(COLORS[0]);
  const [size, setSize] = useState(SIZES[1]);
  const [live, setLive] = useState<Stroke | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const pt = (e: React.PointerEvent): [number, number] => {
    const r = svg.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * W * 10) / 10, Math.round(((e.clientY - r.top) / r.height) * height * 10) / 10];
  };
  const down = (e: React.PointerEvent) => {
    if (!editing) return;
    e.preventDefault();
    svg.current!.setPointerCapture(e.pointerId);
    const [x, y] = pt(e);
    if (tool === 'eraser') updateAttributes({ strokes: eraseAt(strokes, x, y) });
    else setLive({ c: color, w: size, p: [[x, y]] });
  };
  const move = (e: React.PointerEvent) => {
    if (!editing || e.buttons === 0) return;
    const [x, y] = pt(e);
    if (tool === 'eraser') updateAttributes({ strokes: eraseAt(strokes, x, y) });
    else if (live) setLive({ ...live, p: [...live.p, [x, y]] });
  };
  const up = () => {
    if (live) (updateAttributes({ strokes: [...strokes, live] }), setLive(null));
  };
  const all = live ? [...strokes, live] : strokes;
  return (
    <NodeViewWrapper className={`drawing${selected || editing ? ' is-active' : ''}`}>
      <div className="drawing-bar" contentEditable={false} role="toolbar" aria-label="Ferramentas de desenho">
        {editing ? (
          <>
            <button type="button" aria-pressed={tool === 'pen'} onClick={() => setTool('pen')}>Caneta</button>
            <button type="button" aria-pressed={tool === 'eraser'} onClick={() => setTool('eraser')}>Borracha</button>
            <span className="sep" />
            {COLORS.map((c, i) => <button key={c} type="button" className="swatch" aria-label={`Cor ${i + 1}`} aria-pressed={color === c && tool === 'pen'} style={{ background: c }} onClick={() => (setColor(c), setTool('pen'))} />)}
            <span className="sep" />
            {SIZES.map((s) => <button key={s} type="button" aria-label={`Espessura ${s}`} aria-pressed={size === s} onClick={() => setSize(s)}><i style={{ width: s + 4, height: s + 4 }} /></button>)}
            <span className="sep" />
            <button type="button" aria-label="Desfazer" title="Desfazer o último traço" onClick={() => updateAttributes({ strokes: strokes.slice(0, -1) })} disabled={!strokes.length}>↶</button>
            <button type="button" onClick={() => updateAttributes({ strokes: [] })} disabled={!strokes.length}>Limpar</button>
            <button type="button" aria-label="Maior" title="Aumentar a área" onClick={() => updateAttributes({ height: Math.min(720, height + 120) })}>↕ +</button>
            <button type="button" aria-label="Menor" title="Diminuir a área" onClick={() => updateAttributes({ height: Math.max(200, height - 120) })}>↕ −</button>
            <button type="button" className="done" onClick={() => setEditing(false)}>Pronto</button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setEditing(true)}>Editar desenho</button>
            <button type="button" className="img-del" onClick={() => deleteNode()}>Remover</button>
          </>
        )}
      </div>
      <svg ref={svg} viewBox={`0 0 ${W} ${height}`} className="drawing-canvas" style={{ aspectRatio: `${W} / ${height}`, cursor: editing ? (tool === 'eraser' ? 'cell' : 'crosshair') : 'default' }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} role="img" aria-label={all.length ? `Desenho com ${all.length} traços` : 'Desenho vazio'}>
        {all.length === 0 && <text x={W / 2} y={height / 2} textAnchor="middle" className="drawing-hint">Desenhe aqui com o mouse, o dedo ou a caneta</text>}
        {all.map((s, i) => <path key={i} d={pathOf(s.p)} fill="none" stroke={s.c} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>
    </NodeViewWrapper>
  );
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    drawing: { insertDrawing: () => ReturnType };
  }
}

export const Drawing = Node.create({
  name: 'drawing',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { strokes: { default: [] }, height: { default: 320 } };
  },
  parseHTML() {
    return [{ tag: 'div[data-drawing]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-drawing': '' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(DrawingView);
  },
  addCommands() {
    return { insertDrawing: () => ({ commands }) => commands.insertContent({ type: this.name }) };
  },
});
