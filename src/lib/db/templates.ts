import type { TemplateId } from './types';

export interface Template {
  id: TemplateId;
  label: string;
  hint: string;
  icon: string;
  hue: number;
  topics: string[];
}

export const TEMPLATES: Template[] = [
  { id: 'jogo', label: 'Jogo', hint: 'Premissa, mecânica, arte, escopo e riscos', icon: 'gamepad', hue: 285, topics: ['Premissa', 'Mecânica central', 'Arte e clima', 'Referências', 'Escopo', 'Riscos'] },
  { id: 'mod', label: 'Mod de Minecraft', hint: 'Conceito, itens, receitas e compatibilidade', icon: 'cube', hue: 150, topics: ['Conceito', 'Itens e blocos', 'Receitas', 'Mecânica', 'Texturas', 'Compatibilidade'] },
  { id: 'app', label: 'Site ou app', hint: 'Problema, público, telas, stack e MVP', icon: 'layout', hue: 240, topics: ['Problema', 'Público', 'Telas', 'Stack', 'MVP'] },
  { id: 'freelance', label: 'Freelance', hint: 'Cliente, escopo, valor, prazos e entregas', icon: 'briefcase', hue: 60, topics: ['Cliente', 'Escopo', 'Valor', 'Prazos', 'Entregas'] },
  { id: 'livre', label: 'Pasta livre', hint: 'Em branco', icon: 'folder', hue: 25, topics: [] },
];

export const templateOf = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[TEMPLATES.length - 1];

/** Categorias de partida, em grupos que se combinam como filtros. */
export const DEFAULT_CATEGORIES: { name: string; group: string; hue: number }[] = [
  { name: 'Ação', group: 'Gênero', hue: 25 },
  { name: 'Aventura', group: 'Gênero', hue: 70 },
  { name: 'Puzzle', group: 'Gênero', hue: 190 },
  { name: 'Terror', group: 'Gênero', hue: 10 },
  { name: '2D', group: 'Dimensão', hue: 150 },
  { name: '3D', group: 'Dimensão', hue: 260 },
  { name: 'PC', group: 'Plataforma', hue: 230 },
  { name: 'Android', group: 'Plataforma', hue: 140 },
  { name: 'Web', group: 'Plataforma', hue: 200 },
];
