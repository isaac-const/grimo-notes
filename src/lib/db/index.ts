import { createMemoryRepo } from './memory';
import type { Repo } from './types';

export const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

let repo: Promise<Repo> | null = null;

/** No app de verdade usa SQLite. No navegador (desenvolvimento e testes) usa o armazenamento em memória. */
export function getRepo(): Promise<Repo> {
  if (!repo) {
    repo = isTauri()
      ? Promise.all([import('./tauriDriver'), import('./sql')]).then(async ([d, s]) => s.createSqlRepo(await d.createTauriDriver()))
      : Promise.resolve(createMemoryRepo());
  }
  return repo;
}
