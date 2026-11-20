/** Converte o documento do editor (JSON do TipTap) em Markdown. O que não existe em Markdown vira o equivalente mais próximo. */
interface N { type?: string; text?: string; attrs?: Record<string, unknown>; marks?: { type: string; attrs?: Record<string, unknown> }[]; content?: N[] }

const esc = (s: string) => s.replace(/([\\`*_[\]])/g, '\\$1');

function inline(n: N): string {
  if (n.type === 'hardBreak') return '  \n';
  if (n.type !== 'text') return (n.content ?? []).map(inline).join('');
  let t = esc(n.text ?? '');
  const has = (m: string) => n.marks?.some((x) => x.type === m);
  if (has('code')) t = '`' + (n.text ?? '') + '`';
  if (has('bold')) t = `**${t}**`;
  if (has('italic')) t = `*${t}*`;
  if (has('strike')) t = `~~${t}~~`;
  const link = n.marks?.find((x) => x.type === 'link');
  if (link?.attrs?.href) t = `[${t}](${String(link.attrs.href)})`;
  return t;
}

const indent = (s: string, pad: string) => s.split('\n').map((l, i) => (i === 0 || !l ? l : pad + l)).join('\n');

function block(n: N, depth = 0): string {
  const kids = n.content ?? [];
  switch (n.type) {
    case 'paragraph':
      return kids.map(inline).join('');
    case 'heading':
      return `${'#'.repeat(Math.min(6, Number(n.attrs?.level ?? 1)))} ${kids.map(inline).join('')}`;
    case 'bulletList':
      return kids.map((li) => `- ${indent(blocks(li.content ?? [], depth + 1), '  ')}`).join('\n');
    case 'orderedList':
      return kids.map((li, i) => `${i + 1}. ${indent(blocks(li.content ?? [], depth + 1), '   ')}`).join('\n');
    case 'taskList':
      return kids.map((li) => `- [${li.attrs?.checked ? 'x' : ' '}] ${indent(blocks(li.content ?? [], depth + 1), '  ')}`).join('\n');
    case 'blockquote':
      return blocks(kids, depth).split('\n').map((l) => `> ${l}`).join('\n');
    case 'codeBlock':
      return '```' + String(n.attrs?.language ?? '') + '\n' + kids.map((k) => k.text ?? '').join('') + '\n```';
    case 'horizontalRule':
      return '---';
    case 'callout':
      return `> **${{ ideia: 'Ideia', info: 'Nota', aviso: 'Atenção' }[String(n.attrs?.tone)] ?? 'Nota'}**\n` + blocks(kids, depth).split('\n').map((l) => `> ${l}`).join('\n');
    case 'details': {
      const sum = kids.find((k) => k.type === 'detailsSummary');
      const body = kids.find((k) => k.type === 'detailsContent');
      return `<details>\n<summary>${(sum?.content ?? []).map(inline).join('')}</summary>\n\n${blocks(body?.content ?? [], depth)}\n\n</details>`;
    }
    case 'table': {
      const rows = kids.map((r) => (r.content ?? []).map((c) => blocks(c.content ?? [], depth).replace(/\n+/g, ' ').replace(/\|/g, '\\|')));
      if (!rows.length) return '';
      const w = Math.max(...rows.map((r) => r.length));
      const pad = (r: string[]) => `| ${Array.from({ length: w }, (_, i) => r[i] ?? '').join(' | ')} |`;
      return [pad(rows[0]), `| ${Array.from({ length: w }, () => '---').join(' | ')} |`, ...rows.slice(1).map(pad)].join('\n');
    }
    case 'image': {
      const src = String(n.attrs?.src ?? '');
      const cap = String(n.attrs?.caption ?? n.attrs?.alt ?? '');
      return src.startsWith('data:') || src.startsWith('img:') ? `*[imagem${cap ? `: ${cap}` : ''}]*` : `![${cap}](${src})`;
    }
    case 'drawing':
      return '*[desenho]*';
    case 'embed':
      return `[${String(n.attrs?.title || n.attrs?.src)}](${String(n.attrs?.src ?? '')})`;
    default:
      return kids.map((k) => block(k, depth)).join('\n\n');
  }
}

function blocks(list: N[], depth = 0): string {
  return list.map((b) => block(b, depth)).filter((s) => s !== '').join('\n\n');
}

export function docToMarkdown(doc: string): string {
  try {
    const j = JSON.parse(doc) as N;
    if (j && j.type === 'doc') return blocks(j.content ?? []).trim();
  } catch {
    /* texto puro */
  }
  return doc.trim();
}
