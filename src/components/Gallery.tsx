import { useEffect, useMemo, useState } from 'react';
import { useApp } from '../lib/store';
import { docDrawings, docImages } from '../lib/docs';
import { W, pathOf } from '../editor/DrawingNode';
import { resolveSrc } from '../editor/images';
import { hueStyle } from '../lib/hue';

function Pic({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    resolveSrc(src).then((u) => alive && setUrl(u));
    return () => void (alive = false);
  }, [src]);
  return url ? <img src={url} alt={alt} loading="lazy" className="w-full" /> : <div className="h-32 w-full bg-surface-2" />;
}

function Sketch({ strokes, height }: { strokes: { c: string; w: number; p: [number, number][] }[]; height: number }) {
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full bg-bg" role="img" aria-label="Desenho">
      {strokes.map((s, i) => <path key={i} d={pathOf(s.p)} fill="none" stroke={s.c} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round" />)}
    </svg>
  );
}

export function Gallery() {
  const { ideas, folders, go } = useApp();
  const [folderId, setFolderId] = useState('');
  const items = useMemo(
    () =>
      ideas
        .filter((i) => !folderId || i.folderId === folderId)
        .flatMap((i) => [
          ...docImages(i.doc).map((img, n) => ({ kind: 'image' as const, src: img.src, caption: img.caption, idea: i, key: `${i.id}-i${n}` })),
          ...docDrawings(i.doc).map((d, n) => ({ kind: 'drawing' as const, draw: d, caption: 'Desenho', idea: i, key: `${i.id}-d${n}` })),
        ]),
    [ideas, folderId],
  );
  return (
    <div className="mx-auto grid max-w-6xl gap-8 pb-16">
      <header className="flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-sans text-xs uppercase tracking-[.08em] text-muted">{items.length} {items.length === 1 ? 'item' : 'itens'}</p>
          <h1 className="font-display text-5xl leading-none">Galeria</h1>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted">
          Pasta
          <select value={folderId} onChange={(e) => setFolderId(e.target.value)} className="rounded-full border border-line bg-surface px-3 py-2 text-sm text-ink outline-none">
            <option value="">Todas</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </label>
      </header>
      {items.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-[24px] border border-dashed border-line px-6 py-20 text-center">
          <p className="max-w-sm text-muted">Nada por aqui ainda. Imagens e desenhos que você puser nas ideias aparecem aqui, juntos, de todas as pastas.</p>
        </div>
      ) : (
        <div className="columns-2 gap-4 md:columns-3 lg:columns-4">
          {items.map((it) => (
            <button key={it.key} type="button" data-gallery-item onClick={() => go({ name: 'idea', id: it.idea.id })} style={hueStyle(folders.find((f) => f.id === it.idea.folderId)?.hue ?? 25)} className="group relative mb-4 block w-full overflow-hidden rounded-2xl border border-line bg-surface text-left" aria-label={`${it.caption || 'Imagem'}, da ideia ${it.idea.title}`}>
              {it.kind === 'image' ? <Pic src={it.src} alt={it.caption} /> : <Sketch strokes={it.draw.strokes} height={it.draw.height} />}
              <span className="absolute inset-x-0 bottom-0 grid gap-0.5 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                {it.caption && <b className="font-medium">{it.caption}</b>}
                <span className="opacity-80">{it.idea.title}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
