import { iso } from '../lib/calendar';
import type { IdeaPatch, Repo, Status } from '../lib/db/types';

/** Dados de exemplo para ver o app em uso. Tudo aqui é inventado e a pasta de cada ideia diz isso na tela inicial. */
export const DEMO_KEY = 'grimo-demo-folders';

type Node = Record<string, unknown>;
const t = (text: string): Node => ({ type: 'text', text });
const p = (text: string): Node => ({ type: 'paragraph', content: text ? [t(text)] : [] });
const h = (text: string, level = 2): Node => ({ type: 'heading', attrs: { level }, content: [t(text)] });
const ul = (items: string[]): Node => ({ type: 'bulletList', content: items.map((i) => ({ type: 'listItem', content: [p(i)] })) });
const tasks = (items: [string, boolean][]): Node => ({ type: 'taskList', content: items.map(([i, c]) => ({ type: 'taskItem', attrs: { checked: c }, content: [p(i)] })) });
const code = (lang: string, text: string): Node => ({ type: 'codeBlock', attrs: { language: lang }, content: [t(text)] });
const ol = (items: string[]): Node => ({ type: 'orderedList', content: items.map((i) => ({ type: 'listItem', content: [p(i)] })) });
const circ = (cx: number, cy: number, r: number, c = 'var(--ink)', sd = 0) => ({ c, w: 3, p: Array.from({ length: 29 }, (_, i) => [Math.round((cx + Math.cos((i / 28) * Math.PI * 2) * r + Math.sin(i + sd) * 1.2) * 10) / 10, Math.round((cy + Math.sin((i / 28) * Math.PI * 2) * r + Math.cos(i + sd) * 1.2) * 10) / 10] as [number, number]) });
const wave = (a: [number, number], b: [number, number], c = '#4f8dff') => ({ c, w: 3, p: Array.from({ length: 24 }, (_, i) => { const k = i / 23; return [Math.round((a[0] + (b[0] - a[0]) * k) * 10) / 10, Math.round((a[1] + (b[1] - a[1]) * k + Math.sin(k * Math.PI * 4) * 9) * 10) / 10] as [number, number]; }) });
const quote = (text: string): Node => ({ type: 'blockquote', content: [p(text)] });
const callout = (tone: 'ideia' | 'info' | 'aviso', ...content: Node[]): Node => ({ type: 'callout', attrs: { tone }, content });
const toggle = (summary: string, ...content: Node[]): Node => ({ type: 'details', attrs: { open: false }, content: [{ type: 'detailsSummary', content: [t(summary)] }, { type: 'detailsContent', content }] });
const table = (rows: string[][]): Node => ({ type: 'table', content: rows.map((r, i) => ({ type: 'tableRow', content: r.map((c) => ({ type: i === 0 ? 'tableHeader' : 'tableCell', content: [p(c)] })) })) });
const bookmark = (src: string, title: string): Node => ({ type: 'embed', attrs: { kind: 'link', src, title, width: 100 } });
const mark = (text: string, marks: Node[]): Node => ({ type: 'text', text, marks });
const rich = (...parts: Node[]): Node => ({ type: 'paragraph', content: parts });
// desenho de rascunho: segmentos amostrados a cada ~10px, com um leve tremor para parecer feito à mão
const seg = (a: [number, number], b: [number, number], seed = 0): [number, number][] => {
  const n = Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 10));
  return Array.from({ length: n + 1 }, (_, i) => [Math.round((a[0] + ((b[0] - a[0]) * i) / n + Math.sin(i * 1.7 + seed) * 1.1) * 10) / 10, Math.round((a[1] + ((b[1] - a[1]) * i) / n + Math.cos(i * 1.3 + seed) * 1.1) * 10) / 10]);
};
const box = (x: number, y: number, w: number, hh: number, c = 'var(--ink)', sd = 0) => ({ c, w: 3, p: [...seg([x, y], [x + w, y], sd), ...seg([x + w, y], [x + w, y + hh], sd + 1), ...seg([x + w, y + hh], [x, y + hh], sd + 2), ...seg([x, y + hh], [x, y], sd + 3)] });
const arrow = (a: [number, number], b: [number, number], c = '#ff6b4a') => {
  const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  const h = (d: number): [number, number] => [b[0] - Math.cos(ang + d) * 16, b[1] - Math.sin(ang + d) * 16];
  return [{ c, w: 4, p: seg(a, b, 2) }, { c, w: 4, p: [h(0.5), b, h(-0.5)] }];
};
const dot = (x: number, y: number, c: string) => ({ c, w: 8, p: [[x, y], [x + 1, y + 1]] as [number, number][] });
const drawing = (height: number, strokes: object[]): Node => ({ type: 'drawing', attrs: { strokes, height } });
const doc = (...content: Node[]) => JSON.stringify({ type: 'doc', content });

const day = (n: number) => iso(new Date(Date.now() + n * 86_400_000));

interface IdeaSeed {
  title: string;
  status: Status;
  due?: number;
  pinned?: boolean;
  cats: string[];
  doc?: string;
  done?: string[]; // tópicos do modelo marcados
  extraTopics?: [string, boolean][];
}
interface FolderSeed { name: string; template: 'jogo' | 'mod' | 'app' | 'freelance' | 'livre'; hue: number; ideas: IdeaSeed[] }

const CATS: { name: string; group: string; hue: number }[] = [
  { name: 'Estudo', group: 'Área', hue: 240 }, { name: 'Trabalho', group: 'Área', hue: 150 }, { name: 'Casa', group: 'Área', hue: 60 }, { name: 'Viagem', group: 'Área', hue: 190 }, { name: 'Cozinha', group: 'Área', hue: 25 },
  { name: 'Alta', group: 'Prioridade', hue: 10 }, { name: 'Média', group: 'Prioridade', hue: 70 }, { name: 'Baixa', group: 'Prioridade', hue: 150 },
];

const FOLDERS: FolderSeed[] = [
  {
    name: 'Estudos', template: 'livre', hue: 240,
    ideas: [
      {
        title: 'Anotações de banco de dados', status: 'progresso', due: 5, pinned: true, cats: ['Estudo', 'Alta'],
        extraTopics: [['Ler o capítulo 4', true], ['Refazer os exercícios de JOIN', false], ['Montar o resumo para a prova', false]],
        doc: doc(
          h('Normalização'),
          p('Organizar as tabelas para evitar repetição de dados e facilitar a manutenção. Cada forma normal resolve um tipo de problema.'),
          table([['Forma', 'Regra', 'Problema que resolve'], ['1FN', 'Valores atômicos, sem listas na célula', 'Telefones numa coluna só'], ['2FN', 'Sem dependência parcial da chave', 'Dados do produto repetidos no pedido'], ['3FN', 'Sem dependência entre colunas comuns', 'Cidade e estado juntos na tabela do cliente']]),
          h('Consulta de exemplo'),
          code('sql', 'SELECT c.nome, COUNT(p.id) AS pedidos\nFROM clientes c\nLEFT JOIN pedidos p ON p.cliente_id = c.id\nGROUP BY c.nome\nORDER BY pedidos DESC;'),
          callout('aviso', p('Índice demais acelera a leitura e atrapalha a escrita. Criar só onde a consulta realmente pesa.')),
          toggle('Exercícios para refazer', ol(['Listar clientes sem nenhum pedido', 'Total vendido por mês', 'Os 5 produtos mais vendidos'])),
          rich(t('Material de apoio: '), mark('documentação do PostgreSQL', [{ type: 'link', attrs: { href: 'https://www.postgresql.org/docs/' } }]), t('.')),
        ),
      },
      {
        title: 'Resumo de redes de computadores', status: 'explorando', due: 12, cats: ['Estudo', 'Média'], extraTopics: [['Camadas do modelo TCP/IP', true], ['DNS e HTTP', false]],
        doc: doc(
          h('Do clique até a página'),
          p('Quando você abre um site, o navegador pergunta ao DNS qual é o endereço, abre uma conexão e só então pede a página. Cada passo usa uma camada diferente.'),
          drawing(280, [box(50, 100, 150, 80, 'var(--ink)', 1), box(330, 100, 150, 80, '#e0a050', 5), box(610, 100, 140, 80, '#3ec28f', 9), ...arrow([200, 125], [330, 125]), ...arrow([330, 160], [200, 160], '#4f8dff'), ...arrow([480, 125], [610, 125]), ...arrow([610, 160], [480, 160], '#4f8dff'), dot(125, 140, 'var(--ink)'), dot(405, 140, '#e0a050'), dot(680, 140, '#3ec28f')]),
          ul(['Aplicação: HTTP, DNS', 'Transporte: TCP e UDP', 'Rede: IP', 'Enlace: Ethernet e Wi-Fi']),
          quote('Se não tem endereço, não tem entrega.'),
          bookmark('https://developer.mozilla.org/pt-BR/docs/Learn', 'developer.mozilla.org'),
        ),
      },
      { title: 'Plano de leitura da semana', status: 'ideia', due: 3, cats: ['Estudo', 'Baixa'], doc: doc(tasks([['Artigo sobre índices', false], ['Capítulo de sistemas operacionais', false], ['Vídeo da aula de revisão', true]])) },
      { title: 'Curso de fotografia', status: 'arquivada', cats: ['Estudo', 'Baixa'], doc: doc(p('Arquivado: sem tempo neste semestre. Retomar quando a rotina de estudo estiver estável.')) },
    ],
  },
  {
    name: 'Viagens', template: 'livre', hue: 190,
    ideas: [
      {
        title: 'Roteiro de cinco dias', status: 'progresso', due: 12, cats: ['Viagem', 'Média'], extraTopics: [['Passagens', true], ['Hospedagem', true], ['Seguro viagem', false]],
        doc: doc(
          h('Visão geral'),
          p('Cinco dias numa cidade litorânea, sem pressa. A ideia é um passeio grande por dia e o resto livre.'),
          table([['Dia', 'Passeio principal', 'Observação'], ['1', 'Chegada e centro histórico', 'Fazer check-in cedo'], ['2', 'Praia do norte', 'Levar protetor e água'], ['3', 'Passeio de barco', 'Reservar com antecedência'], ['4', 'Mercado e museu', 'Dia de chuva, se houver'], ['5', 'Volta', 'Voo às 16h']]),
          h('Rota (rascunho)'),
          drawing(280, [circ(90, 180, 22, '#e0a050', 0), circ(300, 100, 22, '#4f8dff', 3), circ(520, 190, 22, '#3ec28f', 6), circ(710, 90, 22, '#ff6b4a', 9), wave([112, 170], [278, 112]), wave([322, 110], [498, 182], '#3ec28f'), wave([542, 182], [688, 100], '#e0a050')]),
          callout('info', p('Confirmar o horário do barco um dia antes. Costuma mudar com a maré.')),
          toggle('Plano B se chover', ul(['Museu da cidade', 'Mercado coberto', 'Tarde de café e livro'])),
        ),
      },
      { title: 'Lista da mala', status: 'ideia', due: 11, cats: ['Viagem', 'Baixa'], extraTopics: [['Documentos', false], ['Carregadores', false], ['Remédios', false], ['Roupa para 5 dias', false]], doc: doc(p('Fechar a mala dois dias antes. Pesar para não ter surpresa no aeroporto.')) },
    ],
  },
  {
    name: 'Cozinha', template: 'livre', hue: 25,
    ideas: [
      {
        title: 'Pão de fermentação natural', status: 'pronta', cats: ['Cozinha', 'Baixa'], extraTopics: [['Alimentar o fermento', true], ['Primeira fermentação', true], ['Assar', true]],
        doc: doc(
          h('Proporções'),
          table([['Ingrediente', 'Quantidade', 'Percentual'], ['Farinha', '500 g', '100%'], ['Água', '350 g', '70%'], ['Fermento ativo', '100 g', '20%'], ['Sal', '10 g', '2%']]),
          h('Passos'),
          ol(['Misturar farinha e água e deixar descansar 40 minutos.', 'Juntar o fermento e o sal e dobrar a massa a cada 30 minutos, quatro vezes.', 'Moldar e deixar na geladeira de um dia para o outro.', 'Assar em forno bem quente, tampado nos primeiros 20 minutos.']),
          callout('ideia', p('O miolo fica mais aberto quando a massa está bem hidratada e as dobras são feitas com delicadeza.')),
        ),
      },
      { title: 'Cardápio da semana', status: 'explorando', due: 2, cats: ['Cozinha', 'Média'], doc: doc(ul(['Segunda: macarrão com legumes', 'Terça: frango assado e salada', 'Quarta: sopa e torradas', 'Quinta: omelete recheada', 'Sexta: pizza caseira']), p('Comprar no sábado de manhã. Conferir o que já tem na despensa antes.')) },
    ],
  },
  {
    name: 'Trabalho', template: 'app', hue: 150,
    ideas: [
      {
        title: 'Migração do banco de dados', status: 'explorando', due: -1, cats: ['Trabalho', 'Alta'], done: ['Problema'],
        doc: doc(
          h('Problema'),
          p('O banco atual está no limite de disco e as consultas de relatório travam o sistema no fim do mês. A migração precisa acontecer sem parar o atendimento.'),
          drawing(300, [box(40, 110, 170, 90, 'var(--ink)', 2), box(330, 40, 170, 90, '#e0a050', 6), box(330, 190, 170, 90, '#3ec28f', 10), box(610, 110, 150, 90, '#4f8dff', 14), ...arrow([210, 140], [330, 90]), ...arrow([210, 170], [330, 230]), ...arrow([500, 85], [610, 135]), ...arrow([500, 235], [610, 175]), dot(125, 155, 'var(--ink)'), dot(415, 85, '#e0a050'), dot(415, 235, '#3ec28f'), dot(685, 155, '#4f8dff')]),
          h('Riscos'),
          table([['Risco', 'Chance', 'Plano'], ['Perda de dados na cópia', 'Baixa', 'Validar contagem de linhas por tabela'], ['Lentidão durante a virada', 'Média', 'Fazer fora do horário de pico'], ['Aplicação aponta pro banco velho', 'Alta', 'Trocar a variável de conexão e testar antes']]),
          code('bash', 'pg_dump --format=custom --file=backup.dump banco_antigo\npg_restore --dbname=banco_novo --jobs=4 backup.dump'),
          callout('aviso', p('Prazo combinado venceu ontem. Alinhar nova data com a equipe hoje.')),
        ),
      },
      { title: 'Reunião semanal: pauta', status: 'progresso', due: 1, cats: ['Trabalho', 'Média'], extraTopics: [['Revisar entregas da semana', true]], doc: doc(h('Pauta'), ol(['Status das entregas', 'Bloqueios', 'Prioridades da próxima semana']), tasks([['Enviar a pauta até as 17h', false], ['Levar números do relatório', false]])) },
      {
        title: 'Protótipo do app de tarefas', status: 'ideia', due: 9, pinned: true, cats: ['Trabalho', 'Média'], done: ['Problema'],
        doc: doc(
          h('Ideia'),
          p('Um app de tarefas que mostra só três coisas por vez: a que precisa ser feita agora, a próxima e a que pode esperar.'),
          drawing(320, [box(80, 20, 150, 280, 'var(--ink)', 3), { c: 'var(--ink)', w: 3, p: seg([95, 60], [215, 60], 4) }, box(95, 80, 120, 50, '#ff6b4a', 7), box(95, 145, 120, 50, '#e0a050', 11), box(95, 210, 120, 50, '#3ec28f', 15), box(400, 20, 150, 280, 'var(--ink)', 19), { c: 'var(--ink)', w: 3, p: seg([415, 60], [535, 60], 8) }, { c: '#4f8dff', w: 4, p: seg([415, 100], [530, 100], 2) }, { c: '#4f8dff', w: 4, p: seg([415, 130], [510, 130], 5) }, { c: '#4f8dff', w: 4, p: seg([415, 160], [525, 160], 9) }, ...arrow([240, 160], [390, 160])]),
          tasks([['Testar a ideia no papel com três pessoas', false], ['Escolher a stack', false]]),
        ),
      },
    ],
  },
  {
    name: 'Casa', template: 'livre', hue: 60,
    ideas: [
      {
        title: 'Reforma da cozinha: orçamento', status: 'progresso', due: 15, cats: ['Casa', 'Média'], extraTopics: [['Pedir três orçamentos', true], ['Escolher o piso', false], ['Definir a data', false]],
        doc: doc(
          h('Comparativo'),
          table([['Item', 'Loja A', 'Loja B'], ['Piso (m²)', 'R$ 89', 'R$ 102'], ['Bancada', 'R$ 1.450', 'R$ 1.280'], ['Instalação', 'R$ 900', 'R$ 1.100']]),
          callout('info', p('Valores de exemplo. Pedir sempre o preço com a instalação inclusa.')),
          toggle('Fornecedores para consultar', ul(['Marmoraria do bairro', 'Loja de pisos da avenida', 'Eletricista indicado'])),
        ),
      },
      {
        title: 'Planta do apartamento (rascunho)', status: 'ideia', cats: ['Casa', 'Baixa'],
        doc: doc(h('Onde cada coisa vai'), drawing(320, [box(60, 30, 640, 260, 'var(--ink)', 1), { c: 'var(--ink)', w: 3, p: seg([360, 30], [360, 170], 3) }, { c: 'var(--ink)', w: 3, p: seg([60, 170], [360, 170], 6) }, { c: 'var(--ink)', w: 3, p: seg([360, 170], [700, 170], 9) }, circ(200, 100, 28, '#e0a050', 0), box(430, 70, 120, 60, '#4f8dff', 3), box(120, 200, 100, 60, '#3ec28f', 6), box(500, 200, 140, 60, '#ff6b4a', 9)]), p('Mesa perto da janela, estante na parede maior e espaço livre no meio.')),
      },
    ],
  },
];

export async function loadDemo(repo: Repo): Promise<string[]> {
  const existing = await repo.listCategories();
  for (const c of CATS) if (!existing.some((e) => e.name === c.name && e.group === c.group)) await repo.createCategory(c);
  const cats = await repo.listCategories();
  const byName = new Map(cats.filter((c) => CATS.some((x) => x.name === c.name && x.group === c.group)).map((c) => [c.name, c.id]));
  const created: string[] = [];
  const idByName = new Map<string, string>();
  for (const f of FOLDERS) {
    const folder = await repo.createFolder({ name: f.name, hue: f.hue, template: f.template });
    created.push(folder.id);
    idByName.set(f.name, folder.id);
  }
  // do mais antigo para o mais novo, para a ordem por edição ficar natural
  const ordered = FOLDERS.flatMap((f) => f.ideas.map((i) => ({ f, i }))).reverse();
  for (const { f, i } of ordered) {
    const idea = await repo.createIdea({ folderId: idByName.get(f.name)!, title: i.title });
    const patch: IdeaPatch = { status: i.status, doc: i.doc ?? '', pinned: !!i.pinned, due: i.due === undefined ? null : day(i.due) };
    await repo.updateIdea(idea.id, patch);
    await repo.setIdeaCategories(idea.id, i.cats.map((c) => byName.get(c)).filter((x): x is string => !!x));
    for (const [name, done] of i.extraTopics ?? []) {
      const tp = await repo.addTopic(idea.id, name);
      if (done) await repo.updateTopic(tp.id, { done: true });
    }
    for (const tp of await repo.listTopics(idea.id)) if (i.done?.includes(tp.title)) await repo.updateTopic(tp.id, { done: true });
    await new Promise((r) => setTimeout(r, 4)); // garante ordem estável por data de edição
  }
  return created;
}
