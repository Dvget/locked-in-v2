// File access for backup/export/import. Native uses expo-file-system + sharing; web uses browser download/upload.
import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const AUTO_BACKUP_FOLDER_KEY = 'autoBackupFolder';

const isWeb = Platform.OS === 'web';

/** Saves text as a file and hands it to the share sheet (Files, iCloud Drive, AirDrop ...). */
export async function saveAndShareText(filename: string, text: string, mimeType = 'application/json'): Promise<void> {
  if (isWeb) {
    const blob = new Blob([text], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  const file = new File(Paths.cache, filename);
  file.create({ overwrite: true });
  file.write(text);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType, dialogTitle: filename });
  }
}

/** Lets the user pick a file and returns its text, or null when cancelled. */
export async function pickTextFile(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'text/plain', '*/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  if (isWeb && asset.file) return await asset.file.text();
  return await new File(asset.uri).text();
}

/** Lets the user choose a folder (for example in iCloud Drive) for automatic backups. Native only. */
export async function pickBackupFolder(): Promise<string | null> {
  if (isWeb) return null;
  try {
    const directory = await Directory.pickDirectoryAsync();
    return directory.uri;
  } catch {
    return null;
  }
}

const SNAPSHOTS_TO_KEEP = 7;

/** Writes Latest.json plus a dated snapshot into the chosen folder and prunes old snapshots. */
export async function writeAutomaticBackup(folderUri: string, text: string, now: Date = new Date()): Promise<void> {
  if (isWeb) return;
  const directory = new Directory(folderUri);
  const put = (name: string) => {
    const existing = directory.list().find((e) => e instanceof File && e.name === name);
    if (existing instanceof File) existing.delete();
    const file = directory.createFile(name, 'application/json');
    file.write(text);
  };
  put('Latest.json');
  const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, '-');
  put(`LOCKED-IN-${stamp}.json`);
  const snapshots = directory
    .list()
    .filter((e): e is File => e instanceof File && /^LOCKED-IN-.*\.json$/.test(e.name))
    .sort((a, b) => (a.name < b.name ? 1 : -1));
  for (const old of snapshots.slice(SNAPSHOTS_TO_KEEP)) old.delete();
}
