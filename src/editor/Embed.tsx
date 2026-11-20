import { Node, mergeAttributes } from '@tiptap/core';
import { NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from '@tiptap/react';
import { openExternal } from './open';

export type EmbedKind = 'youtube' | 'vimeo' | 'video' | 'audio' | 'link';

/** Reconhece o tipo do endereço e devolve o que o bloco precisa para exibir. */
export function parseMedia(raw: string): { kind: EmbedKind; src: string; title: string } | null {
  let u: URL;
  try {
    u = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, '');
  const yt = host === 'youtu.be' ? u.pathname.slice(1) : host.endsWith('youtube.com') ? (u.searchParams.get('v') ?? u.pathname.match(/\/(?:embed|shorts)\/([\w-]+)/)?.[1]) : null;
  if (yt && /^[\w-]{6,}$/.test(yt)) return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${yt}`, title: host };
  const vm = host.endsWith('vimeo.com') ? u.pathname.match(/\/(\d+)/)?.[1] : null;
  if (vm) return { kind: 'vimeo', src: `https://player.vimeo.com/video/${vm}`, title: host };
  if (/\.(mp4|webm|ogv|mov)$/i.test(u.pathname)) return { kind: 'video', src: u.href, title: host };
  if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(u.pathname)) return { kind: 'audio', src: u.href, title: host };
  return { kind: 'link', src: u.href, title: host };
}

const SIZES = [['P', 40], ['M', 60], ['G', 80], ['Total', 100]] as const;

function EmbedView({ node, updateAttributes, selected, deleteNode }: NodeViewProps) {
  const { kind, src, title, width } = node.attrs as { kind: EmbedKind; src: string; title: string; width: number };
  return (
    <NodeViewWrapper className={`embed${selected ? ' is-selected' : ''}`} style={{ ['--w' as string]: kind === 'link' ? 100 : width }}>
      {selected && (
        <div className="img-bar" contentEditable={false} role="toolbar" aria-label="Tamanho da mídia">
          {kind !== 'link' && SIZES.map(([l, w]) => <button key={l} type="button" aria-pressed={width === w} onMouseDown={(e) => e.preventDefault()} onClick={() => updateAttributes({ width: w })}>{l}</button>)}
          <button type="button" className="img-del" onMouseDown={(e) => e.preventDefault()} onClick={() => deleteNode()}>Remover</button>
        </div>
      )}
      {(kind === 'youtube' || kind === 'vimeo') && <iframe src={src} title={`Vídeo de ${title}`} allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" className="embed-frame" />}
      {kind === 'video' && <video src={src} controls className="embed-frame" />}
      {kind === 'audio' && <audio src={src} controls className="w-full" />}
      {kind === 'link' && (
        <button type="button" className="bookmark" onClick={() => void openExternal(src)} title={src}>
          <span className="bookmark-host">{title}</span>
          <span className="bookmark-url">{src}</span>
        </button>
      )}
    </NodeViewWrapper>
  );
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embed: { insertMedia: (raw: string) => ReturnType };
  }
}

export const Embed = Node.create({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  addAttributes() {
    return { kind: { default: 'link' }, src: { default: '' }, title: { default: '' }, width: { default: 80 } };
  },
  parseHTML() {
    return [{ tag: 'div[data-embed]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-embed': '' })];
  },
  addNodeView() {
    return ReactNodeViewRenderer(EmbedView);
  },
  addCommands() {
    return {
      insertMedia: (raw) => ({ commands }) => {
        const m = parseMedia(raw);
        return m ? commands.insertContent({ type: this.name, attrs: m }) : false;
      },
    };
  },
});
