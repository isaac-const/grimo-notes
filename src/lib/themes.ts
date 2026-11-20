export const THEMES = [
  { id: 'dark', name: 'Escuro', bg: '#121211', accent: '#ece9e1' },
  { id: 'white', name: 'Claro', bg: '#f5f3ee', accent: '#1b1a17' },
  { id: 'rose-black', name: 'Rosa escuro', bg: '#130c0e', accent: '#ff6b8e' },
  { id: 'rose-white', name: 'Rosa claro', bg: '#fbf3f3', accent: '#c93a60' },
  { id: 'blue-dark', name: 'Azul escuro', bg: '#0a1018', accent: '#5b9bff' },
  { id: 'blue-white', name: 'Azul claro', bg: '#f1f5fb', accent: '#2a62e8' },
] as const;
export type ThemeId = (typeof THEMES)[number]['id'];

export const currentTheme = (): ThemeId => (document.documentElement.dataset.theme as ThemeId) || 'dark';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Troca o tema com revelação circular a partir do ponto clicado (View Transitions); sem suporte, troca direto. */
export function setTheme(id: ThemeId, x: number, y: number) {
  const apply = () => {
    document.documentElement.dataset.theme = id;
    try {
      localStorage.setItem('grimo-theme', id);
    } catch {
      /* sem armazenamento */
    }
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
  if (!doc.startViewTransition || reduced()) return apply();
  const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  doc
    .startViewTransition(apply)
    .ready.then(() =>
      document.documentElement.animate({ clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] }, { duration: 500, easing: 'cubic-bezier(.4,0,.2,1)', pseudoElement: '::view-transition-new(root)' }),
    )
    .catch(() => {});
}
