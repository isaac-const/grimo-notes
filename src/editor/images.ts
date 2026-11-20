import { isTauri } from '../lib/db';

/** Imagens ficam fora do documento. No app: pasta `images` com nome por hash. No navegador: data URL reduzida. */
const PREFIX = 'img:';

async function sha256(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const extOf = (f: File) => (f.type.split('/')[1] || 'png').replace('jpeg', 'jpg').replace('svg+xml', 'svg').replace(/[^a-z0-9]/g, '') || 'png';

async function downscale(file: File, max = 1400): Promise<string> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

export async function storeImage(file: File): Promise<string> {
  if (!isTauri()) {
    try {
      return await downscale(file);
    } catch {
      // SVG e formatos que o navegador não reduz: guarda como veio
      return new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = () => rej(r.error);
        r.readAsDataURL(file);
      });
    }
  }
  const { invoke } = await import('@tauri-apps/api/core');
  const buf = await file.arrayBuffer();
  const name = `${(await sha256(buf)).slice(0, 24)}.${extOf(file)}`;
  await invoke('save_image', new Uint8Array(buf), { headers: { 'x-name': name } });
  return PREFIX + name;
}

let base: string | null = null;
/** Converte o valor guardado no documento em um endereço que o <img> entende. */
export async function resolveSrc(src: string): Promise<string> {
  if (!src.startsWith(PREFIX)) return src;
  const { appDataDir, join } = await import('@tauri-apps/api/path');
  const { convertFileSrc } = await import('@tauri-apps/api/core');
  base ??= await join(await appDataDir(), 'images');
  return convertFileSrc(await join(base, src.slice(PREFIX.length)));
}
export const isStored = (src: string) => src.startsWith(PREFIX);
