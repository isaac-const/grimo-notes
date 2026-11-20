export interface Prefs {
  editorSize: 's' | 'm' | 'l';
  editorWidth: 'narrow' | 'normal' | 'wide';
  bodyFont: 'sans' | 'display' | 'mono';
  reduceMotion: boolean;
  panelDefault: boolean;
  defaultView: 'cards' | 'list' | 'kanban' | 'calendar';
  confirmDelete: boolean;
}

export const DEFAULT_PREFS: Prefs = { editorSize: 'm', editorWidth: 'normal', bodyFont: 'sans', reduceMotion: false, panelDefault: true, defaultView: 'cards', confirmDelete: true };
const KEY = 'grimo-prefs';

/** Aceita só valores conhecidos; qualquer coisa fora do esperado volta ao padrão. */
export function sanitizePrefs(raw: unknown): Prefs {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const pick = <T extends string>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
  return {
    editorSize: pick(r.editorSize, ['s', 'm', 'l'], DEFAULT_PREFS.editorSize),
    editorWidth: pick(r.editorWidth, ['narrow', 'normal', 'wide'], DEFAULT_PREFS.editorWidth),
    bodyFont: pick(r.bodyFont, ['sans', 'display', 'mono'], DEFAULT_PREFS.bodyFont),
    reduceMotion: typeof r.reduceMotion === 'boolean' ? r.reduceMotion : DEFAULT_PREFS.reduceMotion,
    panelDefault: typeof r.panelDefault === 'boolean' ? r.panelDefault : DEFAULT_PREFS.panelDefault,
    defaultView: pick(r.defaultView, ['cards', 'list', 'kanban', 'calendar'], DEFAULT_PREFS.defaultView),
    confirmDelete: typeof r.confirmDelete === 'boolean' ? r.confirmDelete : DEFAULT_PREFS.confirmDelete,
  };
}

export function loadPrefs(): Prefs {
  try {
    return sanitizePrefs(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return DEFAULT_PREFS;
  }
}
export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sem armazenamento */
  }
}

const SIZE = { s: '15.5px', m: '17px', l: '19px' } as const;
const WIDTH = { narrow: '620px', normal: '720px', wide: '880px' } as const;
const FONT = { sans: "var(--font-sans)", display: "var(--font-display)", mono: "var(--font-mono)" } as const;

/** Joga as preferências no html como variáveis de CSS; o editor e a página leem daí. */
export function applyPrefs(p: Prefs) {
  const h = document.documentElement;
  h.style.setProperty('--doc-size', SIZE[p.editorSize]);
  h.style.setProperty('--doc-width', WIDTH[p.editorWidth]);
  h.style.setProperty('--doc-font', FONT[p.bodyFont]);
  h.dataset.reduceMotion = String(p.reduceMotion);
}
