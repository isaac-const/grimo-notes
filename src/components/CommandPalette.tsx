import { useEffect, useMemo, useState } from 'react';
import { Command } from 'cmdk';
import { Icon } from './Icon';
import { useApp } from '../lib/store';
import { norm, searchIdeas } from '../lib/search';
import { THEMES, setTheme } from '../lib/themes';

export function CommandPalette({ onNewFolder }: { onNewFolder: () => void }) {
  const { palette, setPalette, ideas, folders, go, route, addIdea } = useApp();
  const [q, setQ] = useState('');
  useEffect(() => { if (!palette) setQ(''); }, [palette]);
  const hits = useMemo(() => searchIdeas(ideas, folders, q).slice(0, 8), [ideas, folders, q]);
  const close = () => setPalette(false);
  const match = (...t: string[]) => !q.trim() || t.some((x) => norm(x).includes(norm(q.trim())));
  const run = (fn: () => void) => () => { close(); fn(); };
  const curFolder = route.name === 'folder' ? route.id : route.name === 'idea' ? ideas.find((i) => i.id === route.id)?.folderId : folders[0]?.id;
  if (!palette) return null;
  return (
    <div className="fixed inset-0 z-[60] grid place-items-start justify-items-center bg-black/50 p-4 pt-[14vh]" onMouseDown={close}>
      <Command label="Buscar" shouldFilter={false} onMouseDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === 'Escape' && close()} className="w-full max-w-xl overflow-hidden rounded-[22px] border border-line bg-surface shadow-[var(--shadow)]" style={{ animation: 'pal-in .12s ease-out' }}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" className="text-muted" />
          <Command.Input autoFocus value={q} onValueChange={setQ} placeholder="Buscar ideias ou ir para uma pasta" className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-muted" />
          <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[11px] text-muted">Esc</kbd>
        </div>
        <Command.List className="max-h-[52vh] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[.08em] [&_[cmdk-group-heading]]:text-muted">
          <Command.Empty className="px-4 py-8 text-center text-sm text-muted">Nada encontrado.</Command.Empty>
          {q.trim() && hits.length > 0 && (
            <Command.Group heading="Ideias">
              {hits.map((h) => (
                <Item key={h.idea.id} value={`idea-${h.idea.id}`} onSelect={run(() => go({ name: 'idea', id: h.idea.id }))} icon="note" label={h.idea.title} hint={folders.find((f) => f.id === h.idea.folderId)?.name} sub={h.snippet} />
              ))}
            </Command.Group>
          )}
          {(match('início', 'home') || match('galeria', 'imagens') || folders.some((f) => match(f.name))) && (
          <Command.Group heading="Ir para">
            {match('início', 'home') && <Item value="go-home" onSelect={run(() => go({ name: 'home' }))} icon="home" label="Início" />}
            {match('galeria', 'imagens') && <Item value="go-gallery" onSelect={run(() => go({ name: 'gallery' }))} icon="image" label="Galeria" />}
            {folders.filter((f) => match(f.name)).map((f) => (
              <Item key={f.id} value={`go-folder-${f.id}`} onSelect={run(() => go({ name: 'folder', id: f.id }))} icon={f.icon} label={f.name} hint="Pasta" />
            ))}
          </Command.Group>
          )}
          {q.trim() && curFolder && (
            <Command.Group heading="Criar">
              <Item value="create-from-q" onSelect={run(async () => { const i = await addIdea(curFolder, q); go({ name: 'idea', id: i.id }); })} icon="plus" label={`Nova ideia “${q.trim()}”`} hint={folders.find((f) => f.id === curFolder)?.name} />
            </Command.Group>
          )}
          {!q.trim() && (
            <>
              <Command.Group heading="Ações">
                <Item value="new-folder" onSelect={run(onNewFolder)} icon="plus" label="Nova pasta" />
              </Command.Group>
              <Command.Group heading="Tema">
                {THEMES.map((t) => <Item key={t.id} value={`theme-${t.id}`} onSelect={run(() => setTheme(t.id, innerWidth / 2, innerHeight / 3))} icon="palette" label={t.name} />)}
              </Command.Group>
            </>
          )}
        </Command.List>
      </Command>
    </div>
  );
}

function Item({ value, onSelect, icon, label, hint, sub }: { value: string; onSelect: () => void; icon: string; label: string; hint?: string; sub?: string }) {
  return (
    <Command.Item value={value} onSelect={onSelect} className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm data-[selected=true]:bg-surface-2">
      <Icon name={icon} size={17} className="shrink-0 text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block truncate">{label}</span>
        {sub && <span className="block truncate text-xs text-muted">{sub}</span>}
      </span>
      {hint && <span className="shrink-0 text-xs text-muted">{hint}</span>}
    </Command.Item>
  );
}
