import { buildDemoData } from './demoData';
import { MemoryRepository } from './memoryRepository';
import type { Repository } from './repository';

/** Web preview: in-memory repository with demo data (nothing is persisted). */
export function createRepository(): Repository {
  return new MemoryRepository(buildDemoData());
}

export const isDemoRepository = true;
