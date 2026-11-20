import { useMemo, useState } from 'react';
import { Icon } from './Icon';
import { useApp } from '../lib/store';
import { byDue, iso, monthGrid } from '../lib/calendar';
import { hueStyle } from '../lib/hue';
import type { Idea } from '../lib/db/types';

const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function CalendarView({ ideas, folderHue }: { ideas: Idea[]; folderHue: number }) {
  const { go, hues } = useApp();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const grid = useMemo(() => monthGrid(ym.y, ym.m), [ym]);
  const map = useMemo(() => byDue(ideas), [ideas]);
  const today = iso(now);
  const none = ideas.filter((i) => !i.due);
  const shift = (d: number) => setYm(({ y, m }) => { const n = new Date(y, m + d, 1); return { y: n.getFullYear(), m: n.getMonth() }; });
  return (
    <div className="grid gap-6">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-3xl capitalize" aria-live="polite">{MONTHS[ym.m]} <span className="text-muted">{ym.y}</span></h2>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Mês anterior" onClick={() => shift(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted hover:text-ink"><Icon name="back" size={16} /></button>
          <button type="button" onClick={() => setYm({ y: now.getFullYear(), m: now.getMonth() })} className="h-9 rounded-full border border-line px-3 text-sm text-muted hover:text-ink">Hoje</button>
          <button type="button" aria-label="Próximo mês" onClick={() => shift(1)} className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted hover:text-ink"><Icon name="chevron" size={16} /></button>
        </div>
      </div>
      <div className="overflow-hidden rounded-[22px] border border-line bg-surface" role="grid" aria-label="Calendário de prazos">
        <div className="grid grid-cols-7 border-b border-line bg-surface-2/60" role="row">
          {DAYS.map((d) => <div key={d} role="columnheader" className="px-3 py-2 font-sans text-[11px] uppercase tracking-[.08em] text-muted">{d}</div>)}
        </div>
        <div>
          {Array.from({ length: 6 }, (_, w) => grid.slice(w * 7, w * 7 + 7)).map((week) => (
            <div key={week[0].date} role="row" className="grid grid-cols-7">
          {week.map((c) => {
            const list = map.get(c.date) ?? [];
            return (
              <div key={c.date} role="gridcell" data-date={c.date} className={`min-h-[104px] border-b border-r border-line p-1.5 ${c.inMonth ? '' : 'bg-bg/40 text-muted'}`}>
                <span className={`mb-1 inline-grid h-6 min-w-6 place-items-center rounded-full px-1 font-sans text-xs ${c.date === today ? 'bg-accent text-accent-ink' : ''}`}>{Number(c.date.slice(8))}</span>
                <div className="grid gap-1">
                  {list.map((i) => (
                    <button key={i.id} type="button" data-idea={i.id} onClick={() => go({ name: 'idea', id: i.id })} style={hueStyle(hues[i.id] ?? folderHue)} className="cat-soft flex items-center gap-1.5 truncate rounded-lg px-2 py-1 text-left text-xs text-[color:var(--ink)]">
                      <span className="cat-fill h-1.5 w-1.5 shrink-0 rounded-full" />
                      <span className="truncate">{i.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
            </div>
          ))}
        </div>
      </div>
      {none.length > 0 && (
        <p className="text-sm text-muted">{none.length} {none.length === 1 ? 'ideia sem prazo' : 'ideias sem prazo'}: defina um prazo na página da ideia para ela aparecer aqui.</p>
      )}
    </div>
  );
}
