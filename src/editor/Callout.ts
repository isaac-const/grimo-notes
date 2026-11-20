import { Node, mergeAttributes } from '@tiptap/core';

export type Tone = 'ideia' | 'info' | 'aviso';
export const TONES: { id: Tone; label: string }[] = [
  { id: 'ideia', label: 'Ideia' },
  { id: 'info', label: 'Nota' },
  { id: 'aviso', label: 'Atenção' },
];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: { setCallout: (tone?: Tone) => ReturnType };
  }
}

/** Bloco de destaque com texto dentro, no estilo "callout" do Notion. */
export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,
  addAttributes() {
    return { tone: { default: 'ideia', parseHTML: (el) => el.getAttribute('data-tone') ?? 'ideia', renderHTML: (a) => ({ 'data-tone': a.tone }) } };
  },
  parseHTML() {
    return [{ tag: 'div[data-callout]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-callout': '', class: 'callout' }), 0];
  },
  addCommands() {
    return {
      setCallout: (tone = 'ideia') => ({ commands }) => commands.wrapIn(this.name, { tone }),
    };
  },
});
