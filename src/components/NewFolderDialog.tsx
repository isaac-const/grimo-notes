import { useState } from 'react';
import { Modal } from './Modal';
import { Icon } from './Icon';
import { TEMPLATES } from '../lib/db/templates';
import { SWATCHES, hueStyle } from '../lib/hue';
import type { TemplateId } from '../lib/db/types';

export function NewFolderDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (v: { name: string; hue: number; template: TemplateId }) => void }) {
  const [name, setName] = useState('');
  const [tpl, setTpl] = useState<TemplateId>('livre');
  const [hue, setHue] = useState(SWATCHES[0]);
  const submit = () => {
    if (!name.trim()) return;
    onCreate({ name: name.trim(), hue, template: tpl });
    setName('');
    setTpl('livre');
  };
  return (
    <Modal open={open} onClose={onClose} title="Nova pasta">
      <form onSubmit={(e) => (e.preventDefault(), submit())} className="grid gap-5">
        <h2 className="font-display text-2xl">Nova pasta</h2>
        <label className="grid gap-1.5 text-sm text-muted">
          Nome
          <input data-autofocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Jogos, Mods, Freelance" className="h-11 rounded-xl border border-line bg-bg px-3.5 text-base text-ink outline-none focus:border-accent" />
        </label>
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm text-muted">Modelo (cria os tópicos de partida)</legend>
          {TEMPLATES.map((t) => (
            <label key={t.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-surface-2">
              <input type="radio" name="tpl" className="sr-only" checked={tpl === t.id} onChange={() => (setTpl(t.id), setHue(t.hue))} />
              <span className="cat-soft cat-ink grid h-9 w-9 place-items-center rounded-xl" style={hueStyle(t.hue)}>
                <Icon name={t.icon} />
              </span>
              <span className="grid">
                <b className="font-medium">{t.label}</b>
                <span className="text-muted">{t.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-sm text-muted">Cor</legend>
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((h) => (
              <button key={h} type="button" aria-label={`Cor ${h}`} aria-pressed={hue === h} onClick={() => setHue(h)} className="cat-fill h-8 w-8 rounded-full ring-offset-2 ring-offset-surface aria-pressed:ring-2 aria-pressed:ring-ink" style={hueStyle(h)} />
            ))}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-full px-4 text-sm text-muted hover:text-ink">
            Cancelar
          </button>
          <button type="submit" disabled={!name.trim()} className="h-10 rounded-full bg-accent px-5 text-sm font-semibold text-accent-ink disabled:opacity-40">
            Criar pasta
          </button>
        </div>
      </form>
    </Modal>
  );
}
