import { describe, expect, it } from 'vitest';
import { ago, dueLabel, plural } from '../../src/lib/format';

describe('format', () => {
  const t = Date.parse('2026-11-19T12:00:00Z');
  it('tempo relativo', () => {
    expect(ago('2026-11-19T11:59:40Z', t)).toBe('agora');
    expect(ago('2026-11-19T11:40:00Z', t)).toBe('há 20 min');
    expect(ago('2026-11-19T09:00:00Z', t)).toBe('há 3 h');
    expect(ago('2026-11-18T09:00:00Z', t)).toBe('ontem');
    expect(ago('2026-11-10T09:00:00Z', t)).toBe('há 9 dias');
  });
  it('plural', () => {
    expect(plural(1, 'ideia', 'ideias')).toBe('1 ideia');
    expect(plural(0, 'ideia', 'ideias')).toBe('0 ideias');
  });
  it('prazo', () => {
    expect(dueLabel(null)).toBeNull();
    expect(dueLabel('2026-11-19', '2026-11-19')).toEqual({ text: 'vence hoje', late: false });
    expect(dueLabel('2026-11-20', '2026-11-19')).toEqual({ text: 'vence amanhã', late: false });
    expect(dueLabel('2026-11-10', '2026-11-19')?.late).toBe(true);
  });
});

import { excerpt } from '../../src/lib/format';
describe('trecho do cartão', () => {
  it('usa só o texto corrido e pula títulos e imagens', () => {
    const d = JSON.stringify({ type: 'doc', content: [{ type: 'heading', content: [{ type: 'text', text: 'Conceito' }] }, { type: 'image', attrs: { caption: 'x' } }, { type: 'paragraph', content: [{ type: 'text', text: 'Texto do parágrafo.' }] }] });
    expect(excerpt(d)).toBe('Texto do parágrafo.');
    expect(excerpt('texto puro')).toBe('texto puro');
    const lista = JSON.stringify({ type: 'doc', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'um' }] }] }, { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'dois' }] }] }] }] });
    expect(excerpt(lista)).toBe('um · dois');
    expect(excerpt('a'.repeat(200), 20)).toHaveLength(20);
  });
});
