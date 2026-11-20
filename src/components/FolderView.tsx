import { useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { Modal } from './Modal';
import { IdeaCard, IdeaRow } from './IdeaItems';
import { Kanban } from './Kanban';
import { CalendarView } from './CalendarView';
import { useApp } from '../lib/store';
import { plural } from '../lib/format';
import { SWATCHES, hueStyle } from '../lib/hue';

export function FolderView({ id }: { id: string }) {
  const { folders, ideas, view, setView, addIdea, go, editFolder, removeFolder, prefs } = useApp();
  const folder = folders.find((f) => f.id === id);
  const list = ideas.filter((i) => i.folderId === id);
  const [naming, setNaming] = useState(false);
  const [title, setTitle] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  if (!folder) return <p className="py-16 text-center text-muted">Essa pasta não existe mais.</p>;

  const create = async () => {
    const idea = await addIdea(id, title);
    setTitle('');
    setNaming(false);
    go({ name: 'idea', id: idea.id });
  };

  return (
    <div className="mx-auto grid max-w-6xl gap-8 pb-16" style={hueStyle(folder.hue)}>
      <header className="flex flex-wrap items-end gap-4">
        <span className="cat-soft cat-ink grid h-14 w-14 place-items-center rounded-2xl">
          <Icon name={folder.icon} size={26} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-sans text-xs uppercase tracking-[.08em] text-muted">{plural(list.length, 'ideia', 'ideias')}</p>
          <h1 className="truncate font-display text-5xl leading-none">{folder.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Modo de exibição">
            {([['cards', 'Cartões', 'grid'], ['list', 'Lista', 'list'], ['kanban', 'Kanban', 'kanban'], ['calendar', 'Calendário', 'calendar']] as const).map(([v, label, icon]) => (
              <button key={v} type="button" aria-pressed={view === v} aria-label={label} title={label} onClick={() => setView(v)} className="grid h-8 w-9 place-items-center rounded-full text-muted aria-pressed:bg-accent aria-pressed:text-accent-ink">
                <Icon name={icon} size={16} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setEditing(true)} className="h-10 rounded-full border border-line px-4 text-sm text-muted hover:text-ink">
            Editar pasta
          </button>
          <button type="button" id="newIdea" onClick={() => setNaming(true)} className="flex h-10 items-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink">
            <Icon name="plus" size={16} /> Nova ideia
          </button>
        </div>
      </header>

      {list.length === 0 ? (
        <div className="grid place-items-center gap-4 rounded-[24px] border border-dashed border-line px-6 py-20 text-center">
          <p className="max-w-sm text-muted">Essa pasta está vazia. A primeira ideia já nasce com os tópicos do modelo.</p>
          <button type="button" onClick={() => setNaming(true)} className="h-11 rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink">
            Criar a primeira ideia
          </button>
        </div>
      ) : view === 'kanban' ? (
        <Kanban ideas={list} folderHue={folder.hue} />
      ) : view === 'calendar' ? (
        <CalendarView ideas={list} folderHue={folder.hue} />
      ) : view === 'cards' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">{list.map((i) => <IdeaCard key={i.id} idea={i} />)}</AnimatePresence>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-line bg-surface">
          <AnimatePresence initial={false}>{list.map((i) => <IdeaRow key={i.id} idea={i} />)}</AnimatePresence>
        </div>
      )}

      <Modal open={naming} onClose={() => setNaming(false)} title="Nova ideia" width={460}>
        <form onSubmit={(e) => (e.preventDefault(), create())} className="grid gap-4">
          <h2 className="font-display text-2xl">Nova ideia</h2>
          <input data-autofocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título da ideia" aria-label="Título" className="h-11 rounded-xl border border-line bg-bg px-3.5 outline-none focus:border-accent" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNaming(false)} className="h-10 rounded-full px-4 text-sm text-muted hover:text-ink">Cancelar</button>
            <button type="submit" className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink">Criar ideia</button>
          </div>
        </form>
      </Modal>

      <Modal open={editing} onClose={() => (setEditing(false), setConfirm(false))} title="Editar pasta" width={460}>
        <div className="grid gap-5">
          <h2 className="font-display text-2xl">Editar pasta</h2>
          <label className="grid gap-1.5 text-sm text-muted">
            Nome
            <input data-autofocus defaultValue={folder.name} onBlur={(e) => e.target.value.trim() && editFolder(id, { name: e.target.value.trim() })} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="h-11 rounded-xl border border-line bg-bg px-3.5 text-base text-ink outline-none focus:border-accent" />
          </label>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((h) => (
              <button key={h} type="button" aria-label={`Cor ${h}`} aria-pressed={folder.hue === h} onClick={() => editFolder(id, { hue: h })} className="cat-fill h-8 w-8 rounded-full ring-offset-2 ring-offset-surface aria-pressed:ring-2 aria-pressed:ring-ink" style={hueStyle(h)} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-line pt-4">
            {confirm ? (
              <span className="flex items-center gap-2 text-sm">
                Apagar a pasta e {plural(list.length, 'ideia', 'ideias')}?
                <button type="button" id="confirmDelete" onClick={() => removeFolder(id)} className="h-9 rounded-full bg-[oklch(.6_.2_25)] px-4 text-sm font-semibold text-white">Apagar</button>
                <button type="button" onClick={() => setConfirm(false)} className="h-9 px-3 text-sm text-muted">Não</button>
              </span>
            ) : (
              <button type="button" onClick={() => (prefs.confirmDelete ? setConfirm(true) : void removeFolder(id))} className="flex h-9 items-center gap-2 rounded-full px-3 text-sm text-muted hover:text-[oklch(.68_.17_25)]">
                <Icon name="trash" size={15} /> Apagar pasta
              </button>
            )}
            <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink">Pronto</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
