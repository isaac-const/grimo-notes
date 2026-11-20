import Database from '@tauri-apps/plugin-sql';
import type { SqlDriver } from './sql';

export async function createTauriDriver(): Promise<SqlDriver> {
  const db = await Database.load('sqlite:grimo.db');
  return {
    async execute(sql, params = []) {
      await db.execute(sql, params);
    },
    async select<T>(sql: string, params: unknown[] = []) {
      return (await db.select<T[]>(sql, params)) as T[];
    },
  };
}
