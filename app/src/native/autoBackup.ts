import type { Store } from '../data/store';
import { AUTO_BACKUP_FOLDER_KEY, writeAutomaticBackup } from './files';

/** Writes the automatic backup if a folder was chosen. Never throws (a backup problem must not break saving). */
export async function runAutoBackup(store: Pick<Store, 'getKV' | 'exportBackupText'>): Promise<void> {
  try {
    const folder = await store.getKV(AUTO_BACKUP_FOLDER_KEY);
    if (!folder) return;
    await writeAutomaticBackup(folder, await store.exportBackupText());
  } catch {
    // Reported in Data & Backup when the user runs a manual backup.
  }
}
