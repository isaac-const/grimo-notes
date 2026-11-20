import type { Idea } from './db/types';

export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Seis semanas começando no domingo, para o mês (month 0 a 11). */
export function monthGrid(year: number, month: number): { date: string; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return { date: iso(d), inMonth: d.getMonth() === month };
  });
}

export function byDue(ideas: Idea[]): Map<string, Idea[]> {
  const m = new Map<string, Idea[]>();
  for (const i of ideas) if (i.due) m.set(i.due, [...(m.get(i.due) ?? []), i]);
  return m;
}

/** Ideias com prazo entre hoje e daqui a `days` dias (inclusive), ou atrasadas, sem as prontas e arquivadas. */
export function dueSoon(ideas: Idea[], today: string, days = 7): Idea[] {
  const end = iso(new Date(new Date(today + 'T12:00:00').getTime() + days * 86_400_000));
  return ideas.filter((i) => i.due && i.due <= end && i.status !== 'pronta' && i.status !== 'arquivada').sort((a, b) => a.due!.localeCompare(b.due!));
}
