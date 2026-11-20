import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { THEMES, currentTheme, setTheme, type ThemeId } from '../lib/themes';

export function ThemeMenu({ compact }: { compact: boolean }) {
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState<ThemeId>(currentTheme());
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('mousedown', onDown);
    addEventListener('keydown', onKey);
    return () => (removeEventListener('mousedown', onDown), removeEventListener('keydown', onKey));
  }, [open]);
  return (
    <div className="relative" ref={box}>
      <button id="themeBtn" type="button" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen(!open)} className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink">
        <Icon name="palette" />
        {!compact && <span>Tema</span>}
      </button>
      {open && (
        <div role="group" aria-label="Temas" className="absolute bottom-12 left-0 z-40 w-56 rounded-2xl border border-line bg-surface p-2 shadow-[var(--shadow)]">
          {THEMES.map((t) => (
            <button
              key={t.id}
              type="button"
              data-theme-id={t.id}
              aria-pressed={cur === t.id}
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect();
                setTheme(t.id, r.left + 20, r.top + 20);
                setCur(t.id);
              }}
              className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-surface-2 aria-pressed:bg-surface-2 aria-pressed:font-semibold"
            >
              <span className="grid h-6 w-6 place-items-center rounded-full border border-line" style={{ background: t.bg }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: t.accent }} />
              </span>
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
