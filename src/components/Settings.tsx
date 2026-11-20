import { useEffect, useId, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { useApp } from '../lib/store';
import { getRepo, isTauri } from '../lib/db';
import { THEMES, currentTheme, setTheme, type ThemeId } from '../lib/themes';
import { importSnapshot, makeMarkdown, makeSnapshot, parseSnapshot } from '../lib/backup';
import { openTextFile, saveTextFile } from '../lib/files';
import { openExternal } from '../editor/open';
import { SWATCHES, hueStyle } from '../lib/hue';
import type { Prefs } from '../lib/prefs';
import { plural } from '../lib/format';

const Row = ({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) => (
  <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-3.5">
    <div className="min-w-0 max-w-md">
      <div className="text-[15px]">{label}</div>
      {hint && <div className="mt-0.5 text-[13px] text-muted">{hint}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

const Card = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section aria-labelledby={id} className="rounded-[22px] border border-line bg-surface px-6 pb-2 pt-5">
    <h2 id={id} className="mb-1 font-display text-xl font-bold tracking-[-.01em]">{title}</h2>
    <div className="divide-y divide-line">{children}</div>
  </section>
);

function Switch({ on, set, label }: { on: boolean; set: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => set(!on)} className="relative h-6 w-11 rounded-full border border-line bg-surface-2 transition-colors aria-checked:border-transparent aria-checked:bg-accent">
      <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-[left] ${on ? 'left-[22px] bg-accent-ink' : 'left-0.5 bg-muted'}`} aria-hidden="true" />
    </button>
  );
}

function Seg<T extends string>({ value, set, options, label }: { value: T; set: (v: T) => void; options: [T, string][]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-full border border-line bg-bg p-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => set(v)} className="h-8 rounded-full px-3.5 text-sm text-muted aria-checked:bg-accent aria-checked:text-accent-ink">
          {l}
        </button>
      ))}
    </div>
  );
}

const btn = 'h-10 rounded-full border border-line px-4 text-sm text-ink hover:border-accent disabled:opacity-40';

export function Settings({ onNewFolder }: { onNewFolder: () => void }) {
  const { prefs, setPrefs, categories, demoIds, folders, ideas, removeExample, loadExample, removeFolder, reloadAll } = useApp();
  const [theme, setThemeState] = useState<ThemeId>(currentTheme());
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [wipe, setWipe] = useState(false);
  const [dataPath, setDataPath] = useState('Armazenamento do navegador');
  const [name, setName] = useState('');
  const [group, setGroup] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const gid = useId();
  const groups = [...new Set(categories.map((c) => c.group))];
  const set = <K extends keyof Prefs>(k: K) => (v: Prefs[K]) => setPrefs({ [k]: v } as Partial<Prefs>);
  const hasDemo = demoIds.some((id) => folders.some((f) => f.id === id));

  useEffect(() => {
    if (!isTauri()) return;
    import('@tauri-apps/api/path').then(async (p) => setDataPath(await p.join(await p.appConfigDir(), 'grimo.db')));
  }, []);

  const run = async (fn: () => Promise<string | null>) => {
    try {
      const text = await fn();
      if (text) setMsg({ ok: true, text });
    } catch (e) {
      setMsg({ ok: false, text: `Não deu certo: ${e instanceof Error ? e.message : String(e)}` });
    }
  };
  const stamp = () => new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto grid max-w-3xl gap-6 pb-20">
      <header>
        <p className="font-mono text-xs uppercase tracking-[.08em] text-muted">Preferências</p>
        <h1 className="font-display text-5xl font-bold leading-none tracking-[-.025em]">Configurações</h1>
      </header>

      <p role="status" aria-live="polite" className={`min-h-0 rounded-2xl border px-4 py-2.5 text-sm ${msg ? (msg.ok ? 'border-line text-ink' : 'border-[oklch(.6_.2_25)] text-[oklch(.7_.17_25)]') : 'hidden'}`}>{msg?.text}</p>

      <Card id="s-look" title="Aparência">
        <Row label="Tema" hint="Seis opções, em escuro e claro.">
          <div role="radiogroup" aria-label="Tema" className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} aria-label={t.name} title={t.name} onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setTheme(t.id, r.left + 16, r.top + 16); setThemeState(t.id); }} className="grid h-10 w-10 place-items-center rounded-full border border-line ring-offset-2 ring-offset-surface aria-checked:ring-2 aria-checked:ring-ink" style={{ background: t.bg }}>
                <span className="h-3.5 w-3.5 rounded-full" style={{ background: t.accent }} />
              </button>
            ))}
          </div>
        </Row>
        <Row label="Reduzir animações" hint="Troca movimentos por transições curtas. O sistema já pede isso por padrão, se estiver ligado nele.">
          <Switch on={prefs.reduceMotion} set={set('reduceMotion')} label="Reduzir animações" />
        </Row>
      </Card>

      <Card id="s-editor" title="Editor">
        <Row label="Tamanho do texto"><Seg label="Tamanho do texto" value={prefs.editorSize} set={set('editorSize')} options={[['s', 'Pequeno'], ['m', 'Médio'], ['l', 'Grande']]} /></Row>
        <Row label="Largura da página" hint="Quanto espaço o texto ocupa."><Seg label="Largura da página" value={prefs.editorWidth} set={set('editorWidth')} options={[['narrow', 'Estreita'], ['normal', 'Padrão'], ['wide', 'Larga']]} /></Row>
        <Row label="Fonte do texto"><Seg label="Fonte do texto" value={prefs.bodyFont} set={set('bodyFont')} options={[['sans', 'Hanken'], ['display', 'Familjen'], ['mono', 'Geist Mono']]} /></Row>
        <div className="py-4">
          <p className="grimo-doc !min-h-0 !pb-0 rounded-2xl border border-dashed border-line px-5 py-4 !text-[length:var(--doc-size)]" aria-label="Prévia do texto" style={{ fontFamily: 'var(--doc-font)' }}>
            Assim o texto das suas ideias aparece. Mude as opções acima e veja aqui.
          </p>
        </div>
      </Card>

      <Card id="s-work" title="Pastas e ideias">
        <Row label="Visão padrão das pastas"><Seg label="Visão padrão das pastas" value={prefs.defaultView} set={(v) => { set('defaultView')(v); useApp.getState().setView(v); }} options={[['cards', 'Cartões'], ['list', 'Lista'], ['kanban', 'Kanban'], ['calendar', 'Calendário']]} /></Row>
        <Row label="Mostrar as propriedades ao abrir uma ideia" hint="Status, prazo, categorias e tópicos, no painel à direita."><Switch on={prefs.panelDefault} set={(v) => { set('panelDefault')(v); try { localStorage.removeItem('grimo-panel'); } catch { /* sem armazenamento */ } }} label="Mostrar as propriedades ao abrir uma ideia" /></Row>
        <Row label="Pedir confirmação ao apagar" hint="Vale para ideias e pastas."><Switch on={prefs.confirmDelete} set={set('confirmDelete')} label="Pedir confirmação ao apagar" /></Row>
      </Card>

      <Card id="s-cats" title="Categorias">
        <div className="py-3 text-[13px] text-muted">Dão cor e organizam as ideias. A primeira categoria marcada numa ideia define a cor da fita.</div>
        {groups.map((g) => (
          <div key={g} className="py-3.5">
            <div className="mb-2 text-xs text-muted">{g}</div>
            <ul className="grid gap-1">
              {categories.filter((c) => c.group === g).map((c) => (
                <li key={c.id} style={hueStyle(c.hue)} className="rounded-xl border border-line px-3 py-1.5">
                  <div className="flex items-center gap-3">
                    <button type="button" aria-label={`Cor de ${c.name}`} aria-expanded={editing === c.id} onClick={() => setEditing(editing === c.id ? null : c.id)} className="cat-fill h-5 w-5 shrink-0 rounded-full" />
                    <input defaultValue={c.name} aria-label={`Nome da categoria ${c.name}`} onBlur={async (e) => { const v = e.target.value.trim(); if (v && v !== c.name) { await (await getRepo()).updateCategory(c.id, { name: v }); await reloadAll(); } else e.target.value = c.name; }} className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
                    <button type="button" aria-label={`Apagar categoria ${c.name}`} onClick={async () => { await (await getRepo()).deleteCategory(c.id); await reloadAll(); }} className="text-muted hover:text-[oklch(.68_.17_25)]"><Icon name="close" size={15} /></button>
                  </div>
                  {editing === c.id && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pb-1 pl-8">
                      {SWATCHES.map((h) => <button key={h} type="button" aria-label={`Matiz ${h}`} aria-pressed={c.hue === h} onClick={async () => { await (await getRepo()).updateCategory(c.id, { hue: h }); await reloadAll(); }} className="cat-fill h-6 w-6 rounded-full ring-offset-2 ring-offset-surface aria-pressed:ring-2 aria-pressed:ring-ink" style={hueStyle(h)} />)}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <form className="flex flex-wrap items-end gap-2 py-4" onSubmit={async (e) => { e.preventDefault(); const n = name.trim(); const gr = group.trim(); if (!n || !gr) return; await (await getRepo()).createCategory({ name: n, group: gr, hue: SWATCHES[categories.length % SWATCHES.length] }); setName(''); await reloadAll(); }}>
          <label className="grid gap-1 text-xs text-muted">Nome<input value={name} onChange={(e) => setName(e.target.value)} className="h-10 w-44 rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-accent" aria-label="Nome da nova categoria" /></label>
          <label className="grid gap-1 text-xs text-muted">Grupo<input value={group} onChange={(e) => setGroup(e.target.value)} list={gid} placeholder="Escolha ou crie" className="h-10 w-44 rounded-xl border border-line bg-bg px-3 text-sm text-ink outline-none focus:border-accent" aria-label="Grupo da nova categoria" /></label>
          <datalist id={gid}>{groups.map((g) => <option key={g} value={g} />)}</datalist>
          <button type="submit" disabled={!name.trim() || !group.trim()} className={btn}>Adicionar categoria</button>
        </form>
      </Card>

      <Card id="s-data" title="Dados">
        <Row label="Onde ficam os dados" hint="Tudo é guardado só neste computador."><code className="max-w-[22rem] break-all rounded-lg bg-surface-2 px-2.5 py-1.5 font-mono text-xs">{dataPath}</code></Row>
        <Row label="Backup completo" hint="Um arquivo JSON com pastas, ideias, tópicos e categorias. As imagens ficam fora do arquivo."><button type="button" id="exportJson" className={btn} onClick={() => run(async () => ((await saveTextFile(`grimo-backup-${stamp()}.json`, JSON.stringify(await makeSnapshot(await getRepo()), null, 2), 'json', 'Backup do Grimo')) ? 'Backup salvo.' : null))}>Exportar backup</button></Row>
        <Row label="Exportar em Markdown" hint="Um arquivo .md com tudo, para abrir em qualquer editor."><button type="button" id="exportMd" className={btn} onClick={() => run(async () => ((await saveTextFile(`grimo-${stamp()}.md`, await makeMarkdown(await getRepo()), 'md', 'Markdown')) ? 'Markdown salvo.' : null))}>Exportar Markdown</button></Row>
        <Row label="Importar backup" hint="Entra como pastas novas. Nada que já existe é alterado."><button type="button" id="importJson" className={btn} onClick={() => run(async () => { const text = await openTextFile('json', 'Backup do Grimo'); if (text === null) return null; const r = parseSnapshot(text); if (!r.ok) throw new Error(r.error); const n = await importSnapshot(await getRepo(), r.snap); await reloadAll(); return `Importado: ${plural(n.folders, 'pasta', 'pastas')} e ${plural(n.ideas, 'ideia', 'ideias')}.`; })}>Importar backup</button></Row>
        <Row label="Dados de exemplo" hint={hasDemo ? 'Há exemplos carregados. Apagar remove só o que veio deles.' : 'Carrega anotações de mentira para você ver o app com conteúdo.'}>
          {hasDemo ? <button type="button" id="removeExample" className={btn} onClick={() => run(async () => { await removeExample(); return 'Exemplos apagados.'; })}>Apagar exemplos</button> : <button type="button" id="loadExample" className={btn} onClick={() => run(async () => { await loadExample(); return 'Exemplos carregados.'; })}>Carregar exemplos</button>}
        </Row>
        <Row label="Apagar tudo" hint={`${plural(folders.length, 'pasta', 'pastas')} e ${plural(ideas.length, 'ideia', 'ideias')}. Não dá para desfazer: exporte um backup antes.`}>
          {wipe ? (
            <span className="flex items-center gap-2 text-sm">
              Tem certeza?
              <button type="button" id="confirmWipe" onClick={() => run(async () => { for (const f of [...folders]) await removeFolder(f.id); setWipe(false); return 'Tudo foi apagado.'; })} className="h-10 rounded-full bg-[oklch(.6_.2_25)] px-4 text-sm font-semibold text-white">Apagar tudo</button>
              <button type="button" onClick={() => setWipe(false)} className="h-10 px-3 text-muted">Cancelar</button>
            </span>
          ) : (
            <button type="button" id="wipe" disabled={!folders.length} onClick={() => setWipe(true)} className={`${btn} hover:!border-[oklch(.6_.2_25)] hover:text-[oklch(.7_.17_25)]`}>Apagar tudo</button>
          )}
        </Row>
      </Card>

      <Card id="s-about" title="Sobre">
        <Row label="Grimo Notes" hint="Caderno de ideias local. Versão 0.1.0."><button type="button" className={btn} onClick={() => void openExternal('https://github.com/isaac-const/grimo-notes')}>Código no GitHub</button></Row>
        <Row label="Nova pasta" hint="Atalho para criar uma pasta agora."><button type="button" className={btn} onClick={onNewFolder}>Criar pasta</button></Row>
      </Card>
    </div>
  );
}
