import { isTauri } from '../lib/db';

/** Abre um endereço fora do app: no navegador do sistema quando está no Tauri, em nova aba no navegador. */
export async function openExternal(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;
  if (isTauri()) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
