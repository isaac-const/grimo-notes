import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useApp } from '../lib/store';
import { getRepo } from '../lib/db';
import { STATUSES, type Category, type Topic } from '../lib/db/types';
import { STATUS_LABEL, ago } from '../lib/format';
import { hueStyle } from '../lib/hue';
import { RichEditor } from '../editor/Editor';

function useDebounced<T extends unknown[]>(fn: (...a: T) => void, ms: number) {
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  const f = useRef(fn);
  f.current = fn;
  return useMemo(() => (...a: T) => (clearTimeout(t.current), (t.current = setTimeout(() => f.current(...a), ms))), [ms]);
}

const Label = ({ children }: { children: React.ReactNode }) => <h2 className="mb-2.5 font-mono text-[11px] uppercase tracking-[.08em] text-muted">{children}</h2>;

export function IdeaView({ id }: { id: string }) {
  const { ideas, folders, categories, hues, go, patchIdea, removeIdea, refreshHues } = useApp();
  const idea = ideas.find((i) => i.id === id);
  const folder = folders.find((f) => f.id === idea?.folderId);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [mine, setMine] = useState<Category[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [title, setTitle] = useState(idea?.title ?? '');
  const [saved, setSaved] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const { prefs } = useApp();
  const [panel, setPanel] = useState(() => (localStorage.getItem('grimo-panel') ?? (prefs.panelDefault ? 'on' : 'off')) !== 'off');

  useEffect(() => {
    let alive = true;
    getRepo().then(async (r) => {
      const [t, c] = await Promise.all([r.listTopics(id), r.ideaCategories(id)]);
      if (alive) (setTopics(t), setMine(c));
    });
    return () => void (alive = false);
  }, [id]);

  const save = useDebounced((patch: { title?: string; doc?: string }) => patchIdea(id, patch).then(() => setSaved(true)), 450);
  const togglePanel = () => {
    setPanel(!panel);
    try { localStorage.setItem('grimo-panel', panel ? 'off' : 'on'); } catch { /* sem armazenamento */ }
  };

  if (!idea || !folder) return <p className="py-16 text-center text-muted">Essa ideia não existe mais.</p>;
  const hue = hues[idea.id] ?? folder.hue;
  const done = topics.filter((t) => t.done).length;
  const groups = [...new Set(categories.map((c) => c.group))];

  const toggleCat = async (c: Category) => {
    const ids = mine.some((m) => m.id === c.id) ? mine.filter((m) => m.id !== c.id) : [...mine, c];
    setMine(ids);
    await (await getRepo()).setIdeaCategories(id, ids.map((x) => x.id));
    await refreshHues();
  };
  const topicApi = async () => getRepo();

  return (
    <article className="relative mx-auto pb-24" style={{ ...hueStyle(hue), maxWidth: panel ? 'calc(var(--doc-width) + 288px + 3rem)' : 'var(--doc-width)' }}>
      <nav className="mb-6 flex items-center gap-2 text-sm text-muted" aria-label="Caminho">
        <button type="button" onClick={() => go({ name: 'folder', id: folder.id })} className="flex items-center gap-1.5 hover:text-ink">
          <Icon name="back" size={16} /> {folder.name}
        </button>
        <span className="ml-auto font-mono text-xs" aria-live="polite">{saved ? 'Salvo' : 'Salvando…'}</span>
        <button type="button" onClick={togglePanel} aria-pressed={panel} aria-label={panel ? 'Esconder propriedades' : 'Mostrar propriedades'} title="Propriedades" className="grid h-9 w-9 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink aria-pressed:text-ink">
          <Icon name="panel" className="rotate-180" />
        </button>
      </nav>

      <div className={`grid items-start gap-x-12 gap-y-10 ${panel ? 'lg:grid-cols-[minmax(0,1fr)_288px]' : ''}`}>
        <div className="min-w-0">
          <div className="relative">
            <span className="ribbon cat-fill" style={{ right: 0, top: -24, height: 52, width: 18 }} aria-hidden="true" />
            <input
              value={title}
              aria-label="Título da ideia"
              onChange={(e) => (setTitle(e.target.value), setSaved(false), save({ title: e.target.value.trim() || 'Sem título' }))}
              className="w-full bg-transparent pr-10 font-display text-[44px] font-bold leading-[1.08] tracking-[-.025em] outline-none placeholder:text-muted"
              placeholder="Título da ideia"
            />
          </div>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
            <span>{STATUS_LABEL[idea.status]}</span>
            <span aria-hidden="true">·</span>
            <span>editada {ago(idea.updatedAt)}</span>
            {mine.map((c) => (
              <span key={c.id} style={hueStyle(c.hue)} className="flex items-center gap-1.5"><span className="cat-fill h-2 w-2 rounded-full" />{c.name}</span>
            ))}
          </p>
          <div className="mt-8">
            <RichEditor key={id} doc={idea.doc} onChange={(json) => (setSaved(false), save({ doc: json }))} />
          </div>
        </div>

        {panel && (
          <aside aria-label="Propriedades" className="grid min-w-0 gap-8 [&>*]:min-w-0 lg:sticky lg:top-2 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto lg:pr-1">
            <section>
              <Label>Propriedades</Label>
              <div className="grid gap-2.5 text-sm">
                <label className="flex items-center justify-between gap-3 text-muted">
                  Status
                  <select value={idea.status} onChange={(e) => patchIdea(id, { status: e.target.value as typeof idea.status })} className="w-36 min-w-0 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-ink outline-none focus:border-accent">
                    {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3 text-muted">
                  Prazo
                  <input type="date" value={idea.due ?? ''} onChange={(e) => patchIdea(id, { due: e.target.value || null })} className="w-36 min-w-0 rounded-xl border border-line bg-surface px-2.5 py-1.5 text-ink outline-none focus:border-accent" />
                </label>
                <button type="button" aria-pressed={idea.pinned} onClick={() => patchIdea(id, { pinned: !idea.pinned })} className="flex h-9 items-center gap-2 rounded-xl border border-line px-3 text-muted hover:text-ink aria-pressed:border-accent aria-pressed:text-ink">
                  <Icon name="pin" size={15} /> {idea.pinned ? 'Fixada' : 'Fixar'}
                </button>
              </div>
            </section>

            <section aria-labelledby="h-cats">
              <h2 id="h-cats" className="mb-2.5 font-mono text-[11px] uppercase tracking-[.08em] text-muted">Categorias</h2>
              <div className="grid gap-3">
                {groups.map((g) => (
                  <div key={g}>
                    <span className="mb-1.5 block text-xs text-muted">{g}</span>
                    <div className="flex flex-wrap gap-1.5">
                      {categories.filter((c) => c.group === g).map((c) => {
                        const on = mine.some((m) => m.id === c.id);
                        return (
                          <button key={c.id} type="button" aria-pressed={on} onClick={() => toggleCat(c)} style={hueStyle(c.hue)} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[13px] ${on ? 'cat-soft border-transparent text-ink' : 'border-line text-muted hover:text-ink'}`}>
                            <span className="cat-fill h-2 w-2 rounded-full" /> {c.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              {mine.length > 0 && <p className="mt-2 text-xs text-muted">A primeira marcada ({mine[0].name}) dá a cor da fita.</p>}
            </section>

            <section aria-labelledby="h-topics">
              <div className="mb-2.5 flex items-baseline gap-3">
                <h2 id="h-topics" className="font-mono text-[11px] uppercase tracking-[.08em] text-muted">Tópicos</h2>
                {topics.length > 0 && <span className="font-mono text-xs text-muted">{done}/{topics.length}</span>}
              </div>
              <ul className="grid gap-1">
                {topics.map((t) => (
                  <li key={t.id} className="group flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-surface-2">
                    <button type="button" role="checkbox" aria-checked={t.done} aria-label={`Concluir ${t.title}`} onClick={async () => { setTopics(topics.map((x) => (x.id === t.id ? { ...x, done: !t.done } : x))); await (await topicApi()).updateTopic(t.id, { done: !t.done }); }} className="cat-ink grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md border border-line aria-checked:cat-fill aria-checked:border-transparent aria-checked:text-bg">
                      {t.done && <Icon name="check" size={12} />}
                    </button>
                    <input defaultValue={t.title} aria-label="Nome do tópico" onBlur={async (e) => { const v = e.target.value.trim(); if (v && v !== t.title) { setTopics(topics.map((x) => (x.id === t.id ? { ...x, title: v } : x))); await (await topicApi()).updateTopic(t.id, { title: v }); } }} className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${t.done ? 'text-muted line-through' : ''}`} />
                    <button type="button" aria-label={`Apagar ${t.title}`} onClick={async () => { setTopics(topics.filter((x) => x.id !== t.id)); await (await topicApi()).deleteTopic(t.id); }} className="text-muted opacity-0 transition-opacity hover:text-ink focus-visible:opacity-100 group-hover:opacity-100">
                      <Icon name="close" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <form onSubmit={async (e) => { e.preventDefault(); if (!newTopic.trim()) return; const t = await (await topicApi()).addTopic(id, newTopic); setTopics([...topics, t]); setNewTopic(''); }} className="mt-2 flex gap-2">
                <input value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Novo tópico" aria-label="Novo tópico" className="h-9 min-w-0 flex-1 rounded-xl border border-dashed border-line bg-transparent px-3 text-sm outline-none focus:border-accent" />
                <button type="submit" disabled={!newTopic.trim()} className="h-9 rounded-xl border border-line px-3 text-sm text-muted hover:text-ink disabled:opacity-40">Adicionar</button>
              </form>
            </section>

            <section className="border-t border-line pt-4">
              {confirm ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  Apagar esta ideia?
                  <button type="button" id="confirmDelete" onClick={async () => { await removeIdea(id); go({ name: 'folder', id: folder.id }); }} className="h-9 rounded-full bg-[oklch(.6_.2_25)] px-4 text-sm font-semibold text-white">Apagar</button>
                  <button type="button" onClick={() => setConfirm(false)} className="h-9 px-3 text-sm text-muted">Não</button>
                </span>
              ) : (
                <button type="button" onClick={async () => { if (prefs.confirmDelete) setConfirm(true); else { await removeIdea(id); go({ name: 'folder', id: folder.id }); } }} className="flex h-9 items-center gap-2 rounded-full px-1 text-sm text-muted hover:text-[oklch(.68_.17_25)]">
                  <Icon name="trash" size={15} /> Apagar ideia
                </button>
              )}
            </section>
          </aside>
        )}
      </div>
    </article>
  );
}
