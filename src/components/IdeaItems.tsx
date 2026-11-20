import type { MouseEvent } from 'react';
import { motion } from 'motion/react';
import { Icon } from './Icon';
import { useApp } from '../lib/store';
import { ago, dueLabel, excerpt, STATUS_LABEL } from '../lib/format';
import { hueStyle } from '../lib/hue';
import type { Idea } from '../lib/db/types';

function useIdeaMeta(idea: Idea) {
  const { folders, hues } = useApp();
  const folder = folders.find((f) => f.id === idea.folderId);
  return { folder, hue: hues[idea.id] ?? folder?.hue ?? 25, due: dueLabel(idea.due) };
}

const spot = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

const Status = ({ s }: { s: Idea['status'] }) => <span className="rounded-full border border-line px-2.5 py-0.5 font-sans text-[11px] text-muted">{STATUS_LABEL[s]}</span>;

export function IdeaCard({ idea, showFolder }: { idea: Idea; showFolder?: boolean }) {
  const { go } = useApp();
  const { folder, hue, due } = useIdeaMeta(idea);
  return (
    <motion.button
      layout
      layoutId={`idea-${idea.id}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
      whileHover={{ y: -2 }}
      type="button"
      data-idea={idea.id}
      onMouseMove={spot}
      onClick={() => go({ name: 'idea', id: idea.id })}
      className="spot relative grid min-h-[168px] content-start gap-3 overflow-hidden rounded-[22px] border border-line bg-surface p-5 text-left shadow-[var(--shadow)]"
      style={hueStyle(hue)}
    >
      <span className="ribbon cat-fill" aria-hidden="true" />
      {showFolder && folder && (
        <span className="flex items-center gap-1.5 text-xs text-muted" style={hueStyle(folder.hue)}>
          <span className="cat-fill h-2 w-2 rounded-full" />
          {folder.name}
        </span>
      )}
      <h3 className="pr-9 font-display text-[21px] leading-tight">
        {idea.pinned && <Icon name="pin" size={14} className="mr-1.5 inline text-muted" />}
        {idea.title}
      </h3>
      {idea.doc && <p className="line-clamp-2 text-sm leading-relaxed text-muted">{excerpt(idea.doc)}</p>}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
        <Status s={idea.status} />
        {due && <span className={`font-sans text-[11px] ${due.late ? 'text-[oklch(.68_.17_25)]' : 'text-muted'}`}>{due.text}</span>}
        <span className="ml-auto font-sans text-[11px] text-muted">{ago(idea.updatedAt)}</span>
      </div>
    </motion.button>
  );
}

export function IdeaRow({ idea, showFolder }: { idea: Idea; showFolder?: boolean }) {
  const { go } = useApp();
  const { folder, hue, due } = useIdeaMeta(idea);
  return (
    <motion.button
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      type="button"
      data-idea={idea.id}
      onClick={() => go({ name: 'idea', id: idea.id })}
      className="row relative flex w-full items-center gap-4 overflow-hidden border-b border-line px-5 py-3.5 text-left hover:bg-surface-2"
      style={hueStyle(hue)}
    >
      <span className="ribbon cat-fill" style={{ right: 'auto', left: 14, height: 18 }} aria-hidden="true" />
      <span className="min-w-0 flex-1 pl-6">
        <span className="block truncate font-display text-lg">
          {idea.pinned && <Icon name="pin" size={13} className="mr-1.5 inline text-muted" />}
          {idea.title}
        </span>
        {idea.doc && <span className="block truncate text-sm text-muted">{excerpt(idea.doc, 90)}</span>}
      </span>
      {showFolder && folder && <span className="hidden text-xs text-muted md:block">{folder.name}</span>}
      <Status s={idea.status} />
      {due && <span className={`hidden font-sans text-[11px] sm:block ${due.late ? 'text-[oklch(.68_.17_25)]' : 'text-muted'}`}>{due.text}</span>}
      <span className="w-20 text-right font-sans text-[11px] text-muted">{ago(idea.updatedAt)}</span>
    </motion.button>
  );
}
