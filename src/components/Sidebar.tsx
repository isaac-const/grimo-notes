import { motion } from 'motion/react';
import { Icon } from './Icon';
import { ThemeMenu } from './ThemeMenu';
import { useApp } from '../lib/store';
import { hueStyle } from '../lib/hue';

export function Sidebar({ onNewFolder }: { onNewFolder: () => void }) {
  const { folders, ideas, route, go, collapsed, toggleSidebar, setPalette } = useApp();
  const count = (id: string) => ideas.filter((i) => i.folderId === id).length;
  const active = (id: string) => (route.name === 'folder' && route.id === id) || (route.name === 'idea' && ideas.find((i) => i.id === route.id)?.folderId === id);
  return (
    <motion.aside initial={false} animate={{ width: collapsed ? 72 : 272 }} transition={{ type: 'spring', stiffness: 380, damping: 32 }} className="flex h-full shrink-0 flex-col border-r border-line bg-surface" aria-label="Barra lateral">
      <div className="flex h-16 items-center gap-3 px-4">
        <button type="button" onClick={() => go({ name: 'home' })} aria-label="Grimo Notes, início" className="flex min-w-0 items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}logo.svg`} alt="" width={32} height={32} className="rounded-lg" />
          {!collapsed && <span className="truncate font-display text-xl">Grimo</span>}
        </button>
        <button type="button" onClick={toggleSidebar} aria-label={collapsed ? 'Expandir barra lateral' : 'Recolher barra lateral'} className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted hover:bg-surface-2 hover:text-ink">
          <Icon name="panel" />
        </button>
      </div>
      <div className="px-3 pb-2">
        <button type="button" id="openPalette" onClick={() => setPalette(true)} aria-label={collapsed ? 'Buscar' : undefined} className="flex h-10 w-full items-center gap-3 rounded-xl border border-line px-3 text-sm text-muted hover:text-ink">
          <Icon name="search" />
          {!collapsed && <span>Buscar</span>}
        </button>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 pb-3" aria-label="Pastas">
        <button type="button" onClick={() => go({ name: 'home' })} aria-current={route.name === 'home' ? 'page' : undefined} className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink">
          <Icon name="home" />
          {!collapsed && 'Início'}
        </button>
        <button type="button" onClick={() => go({ name: 'gallery' })} aria-current={route.name === 'gallery' ? 'page' : undefined} className="flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink">
          <Icon name="image" />
          {!collapsed && 'Galeria'}
        </button>
        {!collapsed && <div className="px-3 pb-1 pt-4 font-mono text-[11px] uppercase tracking-[.08em] text-muted">Pastas</div>}
        {collapsed && <div className="my-2 h-px bg-line" />}
        {folders.map((f) => (
          <button key={f.id} type="button" data-folder={f.id} onClick={() => go({ name: 'folder', id: f.id })} aria-current={active(f.id) ? 'page' : undefined} title={f.name} className="group flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink">
            <span className="cat-ink grid h-5 w-5 shrink-0 place-items-center" style={hueStyle(f.hue)}>
              <Icon name={f.icon} size={18} />
            </span>
            {!collapsed && (
              <>
                <span className="truncate">{f.name}</span>
                <span className="ml-auto font-mono text-xs text-muted">{count(f.id)}</span>
              </>
            )}
          </button>
        ))}
        <button type="button" onClick={onNewFolder} aria-label="Nova pasta" className="mt-1 flex h-10 items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink">
          <Icon name="plus" />
          {!collapsed && 'Nova pasta'}
        </button>
      </nav>
      <div className="grid gap-1 border-t border-line p-3">
        <button type="button" onClick={() => go({ name: 'settings' })} aria-current={route.name === 'settings' ? 'page' : undefined} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-2 aria-[current=page]:text-ink">
          <Icon name="settings" />
          {!collapsed && <span>Configurações</span>}
        </button>
        <ThemeMenu compact={collapsed} />
      </div>
    </motion.aside>
  );
}
