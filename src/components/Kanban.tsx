import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { useState } from 'react';
import { Icon } from './Icon';
import { useApp } from '../lib/store';
import { STATUSES, type Idea, type Status } from '../lib/db/types';
import { STATUS_LABEL, dueLabel } from '../lib/format';
import { hueStyle } from '../lib/hue';

function Card({ idea, hue, dragging }: { idea: Idea; hue: number; dragging?: boolean }) {
  const due = dueLabel(idea.due);
  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-surface p-4 text-left transition-[transform,border-color] ${dragging ? 'scale-[1.02] border-accent shadow-[0_6px_16px_rgba(0,0,0,.16)]' : 'border-line hover:border-[color-mix(in_oklab,var(--ink)_28%,var(--line))]'}`} style={hueStyle(hue)}>
      <span className="ribbon cat-fill" style={{ right: 16, height: 22 }} aria-hidden="true" />
      <h4 className="pr-8 font-display text-[17px] leading-snug">{idea.pinned && <Icon name="pin" size={12} className="mr-1 inline text-muted" />}{idea.title}</h4>
      {due && <p className={`mt-2 font-sans text-[11px] ${due.late ? 'text-[oklch(.68_.17_25)]' : 'text-muted'}`}>{due.text}</p>}
    </div>
  );
}

function Draggable({ idea, hue }: { idea: Idea; hue: number }) {
  const { go } = useApp();
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: idea.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} data-idea={idea.id} onClick={() => go({ name: 'idea', id: idea.id })} style={{ opacity: isDragging ? 0.35 : 1 }} className="cursor-grab touch-none active:cursor-grabbing" role="button">
      <Card idea={idea} hue={hue} />
    </div>
  );
}

function Column({ status, ideas, hueOf }: { status: Status; ideas: Idea[]; hueOf: (i: Idea) => number }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section ref={setNodeRef} data-col={status} aria-label={STATUS_LABEL[status]} className={`flex min-h-[280px] min-w-[176px] flex-1 basis-0 flex-col gap-3 rounded-[22px] border p-3 transition-colors ${isOver ? 'border-accent bg-surface-2' : 'border-line bg-surface/50'}`}>
      <header className="flex items-baseline justify-between px-2 pt-1">
        <h3 className="font-sans text-xs uppercase tracking-[.08em] text-muted">{STATUS_LABEL[status]}</h3>
        <span className="font-sans text-xs text-muted">{ideas.length}</span>
      </header>
      {ideas.map((i) => <Draggable key={i.id} idea={i} hue={hueOf(i)} />)}
      {ideas.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted">Solte uma ideia aqui</p>}
    </section>
  );
}

export function Kanban({ ideas, folderHue }: { ideas: Idea[]; folderHue: number }) {
  const { patchIdea, hues } = useApp();
  const [active, setActive] = useState<Idea | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const hueOf = (i: Idea) => hues[i.id] ?? folderHue;
  const end = (e: DragEndEvent) => {
    setActive(null);
    const to = e.over?.id as Status | undefined;
    const idea = ideas.find((i) => i.id === e.active.id);
    if (idea && to && STATUSES.includes(to) && idea.status !== to) void patchIdea(idea.id, { status: to });
  };
  return (
    <DndContext sensors={sensors} onDragStart={(e: DragStartEvent) => setActive(ideas.find((i) => i.id === e.active.id) ?? null)} onDragEnd={end} onDragCancel={() => setActive(null)}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((s) => <Column key={s} status={s} ideas={ideas.filter((i) => i.status === s)} hueOf={hueOf} />)}
      </div>
      <DragOverlay dropAnimation={{ duration: 260, easing: 'cubic-bezier(.34,1.56,.64,1)' }}>{active && <Card idea={active} hue={hueOf(active)} dragging />}</DragOverlay>
    </DndContext>
  );
}
