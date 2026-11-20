import { describe, expect, it } from 'vitest';
import { docImages, docText } from '../../src/lib/docs';
import { searchIdeas, norm } from '../../src/lib/search';
import { byDue, dueSoon, monthGrid } from '../../src/lib/calendar';
import type { Folder, Idea } from '../../src/lib/db/types';

const doc = JSON.stringify({
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Premissa' }] },
    { type: 'paragraph', content: [{ type: 'text', text: 'Masmorra aconchegante com receitas' }] },
    { type: 'image', attrs: { src: 'img:abc.png', caption: 'Sala da forja', layout: 'left' } },
    { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'item' }] }] }] },
  ],
});

const folder = (id: string, name: string): Folder => ({ id, name, hue: 1, icon: 'folder', template: 'livre', sort: 0, createdAt: '' });
const idea = (id: string, title: string, o: Partial<Idea> = {}): Idea => ({ id, folderId: 'f1', title, doc: '', status: 'ideia', due: null, pinned: false, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', ...o });

describe('documento', () => {
  it('extrai o texto e a legenda das imagens', () => {
    const t = docText(doc);
    expect(t).toContain('Premissa');
    expect(t).toContain('Masmorra aconchegante com receitas');
    expect(t).toContain('Sala da forja');
  });
  it('texto puro continua valendo', () => {
    expect(docText('só texto')).toBe('só texto');
    expect(docImages('só texto')).toEqual([]);
  });
  it('lista as imagens com posição e legenda', () => {
    expect(docImages(doc)).toEqual([{ src: 'img:abc.png', caption: 'Sala da forja', layout: 'left' }]);
  });
});

describe('busca', () => {
  const folders = [folder('f1', 'Jogos de Terror'), folder('f2', 'Mods')];
  const ideas = [
    idea('1', 'Plano de estudo', { doc }),
    idea('2', 'Casa assombrada', { folderId: 'f1', updatedAt: '2026-02-01T00:00:00Z' }),
    idea('3', 'Espada de cristal', { folderId: 'f2' }),
  ];
  it('ignora acento e maiúscula', () => {
    expect(norm('Ação')).toBe('acao');
    expect(searchIdeas(ideas, folders, 'ASSOMBRADA').map((h) => h.idea.id)).toEqual(['2']);
    expect(searchIdeas(ideas, folders, 'espada cristál').map((h) => h.idea.id)).toEqual(['3']);
  });
  it('exige todas as palavras e título pesa mais que corpo', () => {
    expect(searchIdeas(ideas, folders, 'plano receitas').map((h) => h.idea.id)).toEqual(['1']);
    expect(searchIdeas(ideas, folders, 'plano xyz')).toEqual([]);
    const r = searchIdeas([idea('a', 'Outra', { doc: 'forja' }), idea('b', 'Forja grande')], folders, 'forja');
    expect(r.map((h) => h.idea.id)).toEqual(['b', 'a']);
  });
  it('acha pela legenda de imagem, pelo nome da pasta e pelos tópicos', () => {
    expect(searchIdeas(ideas, folders, 'forja').map((h) => h.idea.id)).toEqual(['1']);
    expect(searchIdeas(ideas, folders, 'terror').map((h) => h.idea.id).sort()).toEqual(['1', '2']);
    const topics = [{ id: 't', ideaId: '3', title: 'Compatibilidade', done: false, sort: 0 }];
    expect(searchIdeas(ideas, folders, 'compatibilidade', topics).map((h) => h.idea.id)).toEqual(['3']);
  });
  it('busca vazia não devolve nada e o trecho aparece', () => {
    expect(searchIdeas(ideas, folders, '   ')).toEqual([]);
    expect(searchIdeas(ideas, folders, 'masmorra')[0].snippet).toContain('Masmorra');
  });
});

describe('calendário', () => {
  it('grade de 42 dias começando no domingo', () => {
    const g = monthGrid(2026, 10); // novembro de 2026: dia 1 é domingo
    expect(g).toHaveLength(42);
    expect(g[0]).toEqual({ date: '2026-11-01', inMonth: true });
    expect(g.filter((d) => d.inMonth)).toHaveLength(30);
    const dez = monthGrid(2026, 11); // dezembro começa numa terça
    expect(dez[0].date).toBe('2026-11-29');
    expect(dez[0].inMonth).toBe(false);
  });
  it('agrupa por prazo e separa os que vencem logo', () => {
    const ideas = [idea('1', 'a', { due: '2026-11-20' }), idea('2', 'b', { due: '2026-11-20' }), idea('3', 'c', { due: '2026-12-30' }), idea('4', 'd', { due: '2026-11-10' }), idea('5', 'e', { due: '2026-11-21', status: 'pronta' }), idea('6', 'f')];
    expect(byDue(ideas).get('2026-11-20')).toHaveLength(2);
    expect(dueSoon(ideas, '2026-11-19', 7).map((i) => i.id)).toEqual(['4', '1', '2']); // atrasada primeiro, pronta e sem prazo fora
  });
});
