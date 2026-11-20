import { isTauri } from './db';

/** Salvar e abrir arquivos de texto. No app usa os diálogos do sistema; no navegador, download e seletor de arquivo. */
export async function saveTextFile(defaultName: string, content: string, ext: string, label: string): Promise<boolean> {
  if (isTauri()) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: defaultName, filters: [{ name: label, extensions: [ext] }] });
    if (!path) return false;
    await writeTextFile(path, content);
    return true;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  a.download = defaultName;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return true;
}

export async function openTextFile(ext: string, label: string): Promise<string | null> {
  if (isTauri()) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({ multiple: false, filters: [{ name: label, extensions: [ext] }] });
    return typeof path === 'string' ? readTextFile(path) : null;
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `.${ext}`;
    input.onchange = () => (input.files?.[0] ? input.files[0].text().then(resolve) : resolve(null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
