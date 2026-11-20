import { useState, type FormEvent, type MouseEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { Icon } from './Icon';
import { IdeaCard } from './IdeaItems';
import { useApp } from '../lib/store';
import { plural } from '../lib/format';
import { hueStyle } from '../lib/hue';
import { TEMPLATES } from '../lib/db/templates';
import { dueSoon, iso } from '../lib/calendar';

const spot = (e: MouseEvent<HTMLElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

export function Home({ onNewFolder }: { onNewFolder: () => void }) {
  const { folders, ideas, go, addIdea, demoIds, loadExample, removeExample } = useApp();
  const hasDemo = demoIds.some((id) => folders.some((f) => f.id === id));
  const [title, setTitle] = useState('');
  const [folderId, setFolderId] = useState('');
  const target = folderId || folders[0]?.id || '';
  const soon = dueSoon(ideas, iso(new Date()), 7);
  const shown = new Set(soon.map((i) => i.id));
  const pinned = ideas.filter((i) => i.pinned && !shown.has(i.id));
  pinned.forEach((i) => shown.add(i.id));
  const recent = ideas.filter((i) => !shown.has(i.id)).slice(0, 6);

  const capture = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !target) return;
    const idea = await addIdea(target, title);
    setTitle('');
    go({ name: 'idea', id: idea.id });
  };

  if (folders.length === 0) {
    return (
      <div className="mx-auto grid max-w-3xl gap-8 py-16">
        <div>
          <h1 className="font-display text-5xl leading-[1.05]">Um caderno para o que ainda não existe.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">Comece criando uma pasta. Cada modelo já nasce com os tópicos certos, e tudo fica no seu computador.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={onNewFolder} className="h-12 w-fit rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink">
            Criar a primeira pasta
          </button>
          <button type="button" id="loadExample" onClick={() => void loadExample()} className="h-12 rounded-full border border-line px-6 text-sm text-muted hover:text-ink">
            Ver com dados de exemplo
          </button>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.slice(0, 4).map((t) => (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4" style={hueStyle(t.hue)}>
              <span className="cat-soft cat-ink grid h-10 w-10 place-items-center rounded-xl">
                <Icon name={t.icon} />
              </span>
              <span className="grid text-sm">
                <b className="font-medium">{t.label}</b>
                <span className="text-muted">{t.hint}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 pb-16">
      {hasDemo && (
        <p role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-dashed border-line px-4 py-2.5 text-sm text-muted">
          Dados de exemplo: tudo aqui é inventado, só para mostrar o app em uso.
          <button type="button" id="removeExample" onClick={() => void removeExample()} className="ml-auto rounded-full border border-line px-3 py-1 text-xs hover:text-ink">Apagar exemplos</button>
        </p>
      )}
      <header className="grid gap-5 pt-2 md:grid-cols-[1fr_minmax(320px,420px)] md:items-end">
        <div>
          <p className="font-sans text-xs uppercase tracking-[.08em] text-muted">{plural(ideas.length, 'ideia', 'ideias')} em {plural(folders.length, 'pasta', 'pastas')}</p>
          <h1 className="mt-2 font-display text-5xl leading-none">Suas ideias</h1>
        </div>
        <form onSubmit={capture} className="flex items-center gap-2 rounded-full border border-line bg-surface p-1.5 pl-4 shadow-[var(--shadow)] focus-within:border-accent" aria-label="Captura rápida">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Anote uma ideia e aperte Enter" aria-label="Título da nova ideia" className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted" />
          <select value={target} onChange={(e) => setFolderId(e.target.value)} aria-label="Pasta da nova ideia" className="max-w-[9rem] rounded-full bg-surface-2 px-3 py-2 text-xs text-muted outline-none">
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={!title.trim()} aria-label="Criar ideia" className="grid h-9 w-9 place-items-center rounded-full bg-accent text-accent-ink disabled:opacity-40">
            <Icon name="plus" size={17} />
          </button>
        </form>
      </header>

      {soon.length > 0 && (
        <section aria-labelledby="h-soon" className="grid gap-4">
          <h2 id="h-soon" className="font-sans text-xs uppercase tracking-[.08em] text-muted">Vencendo na semana</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">{soon.map((i) => <IdeaCard key={i.id} idea={i} showFolder />)}</AnimatePresence>
          </div>
        </section>
      )}

      {pinned.length > 0 && (
        <section aria-labelledby="h-pin" className="grid gap-4">
          <h2 id="h-pin" className="font-sans text-xs uppercase tracking-[.08em] text-muted">Fixadas</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">{pinned.map((i) => <IdeaCard key={i.id} idea={i} showFolder />)}</AnimatePresence>
          </div>
        </section>
      )}

      <section aria-labelledby="h-folders" className="grid gap-4">
        <h2 id="h-folders" className="font-sans text-xs uppercase tracking-[.08em] text-muted">Pastas</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {folders.map((f) => {
            const n = ideas.filter((i) => i.folderId === f.id).length;
            return (
              <button key={f.id} type="button" data-folder-card={f.id} onMouseMove={spot} onClick={() => go({ name: 'folder', id: f.id })} className="spot cat-soft grid min-h-[132px] content-between rounded-[22px] border border-line p-5 text-left transition-transform hover:-translate-y-0.5" style={hueStyle(f.hue)}>
                <span className="cat-ink"><Icon name={f.icon} size={26} /></span>
                <span>
                  <b className="block font-display text-2xl font-medium leading-tight text-[color:var(--ink)]">{f.name}</b>
                  <span className="font-sans text-xs text-[color:var(--ink)] opacity-70">{plural(n, 'ideia', 'ideias')}</span>
                </span>
              </button>
            );
          })}
          <button type="button" onClick={onNewFolder} className="grid min-h-[132px] place-items-center rounded-[22px] border border-dashed border-line text-sm text-muted transition-colors hover:border-accent hover:text-ink">
            <span className="flex items-center gap-2"><Icon name="plus" size={16} /> Nova pasta</span>
          </button>
        </div>
      </section>

      <section aria-labelledby="h-rec" className="grid gap-4">
        <h2 id="h-rec" className="font-sans text-xs uppercase tracking-[.08em] text-muted">Recentes</h2>
        {recent.length === 0 && pinned.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Nada por aqui ainda. Anote a primeira ideia na caixa de cima.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">{recent.map((i) => <IdeaCard key={i.id} idea={i} showFolder />)}</AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
