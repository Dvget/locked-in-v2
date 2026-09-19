import type { Repository } from './repository';
import { SqliteRepository } from './sqliteRepository';

/** Native: SQLite on the phone. (The web variant lives in createRepository.web.ts.) */
export function createRepository(): Repository {
  return new SqliteRepository();
}

export const isDemoRepository = false;
