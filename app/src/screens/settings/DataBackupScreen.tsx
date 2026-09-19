import { useEffect, useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Button, Muted, SectionLabel } from '../../components/ui';
import { BackupError, backupSummary, parseBackup } from '../../data/backup';
import { useStore } from '../../data/store';
import { runToGpx } from '../../domain/gpx';
import {
  AUTO_BACKUP_FOLDER_KEY,
  pickBackupFolder,
  pickTextFile,
  saveAndShareText,
  writeAutomaticBackup,
} from '../../native/files';
import { colors } from '../../theme';

function stamp(): string {
  return new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
}

function confirmReplace(summary: string, onConfirm: () => void) {
  const message = `${summary}\n\nAlle aktuellen Daten werden ersetzt. Vorher wird automatisch eine Sicherung im Gerät abgelegt.`;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`Backup wiederherstellen?\n${message}`)) onConfirm();
    return;
  }
  Alert.alert('Backup wiederherstellen?', message, [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Ersetzen', style: 'destructive', onPress: onConfirm },
  ]);
}

export function DataBackupScreen() {
  const store = useStore();
  const [message, setMessage] = useState<string | null>(null);
  const [folder, setFolder] = useState<string | null>(null);

  useEffect(() => {
    store.getKV(AUTO_BACKUP_FOLDER_KEY).then(setFolder);
  }, [store]);

  const run = async (task: () => Promise<string | void>) => {
    try {
      const result = await task();
      setMessage(result ?? null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Das hat nicht geklappt.');
    }
  };

  const exportBackup = () =>
    run(async () => {
      await saveAndShareText(`LOCKED-IN-Backup-${stamp()}.json`, await store.exportBackupText());
      return 'Backup erstellt.';
    });

  const importBackup = () =>
    run(async () => {
      const text = await pickTextFile();
      if (text === null) return;
      const parsed = (() => {
        try {
          return parseBackup(text);
        } catch (e) {
          throw e instanceof BackupError ? e : new Error('Die Datei konnte nicht gelesen werden.');
        }
      })();
      const s = backupSummary(parsed);
      confirmReplace(
        `${s.workouts} Trainings, ${s.runs} Läufe, ${s.weights} Gewichte, ${s.steps} Schrittwerte, ${s.plans} Pläne`,
        () => {
          store
            .importBackupText(text)
            .then(() => setMessage('Backup wiederhergestellt.'))
            .catch((e) => setMessage(e instanceof Error ? e.message : 'Wiederherstellen fehlgeschlagen.'));
        },
      );
    });

  const exportAll = () =>
    run(async () => {
      await saveAndShareText(`LOCKED-IN-Tracking-${stamp()}.json`, await store.exportBackupText());
      return 'Diagnose-Export erstellt.';
    });

  const exportGpx = () =>
    run(async () => {
      const runs = store.data.runs.filter((r) => !r.isHidden).sort((a, b) => b.date - a.date);
      for (const r of runs) {
        const points = await store.getTrackPoints(r.id);
        const gpx = runToGpx(r, points);
        if (gpx) {
          await saveAndShareText(`Lauf-${new Date(r.date).toISOString().slice(0, 10)}.gpx`, gpx, 'application/gpx+xml');
          return 'GPX des letzten Laufs mit Strecke erstellt.';
        }
      }
      return 'Kein Lauf mit gespeicherter Strecke gefunden.';
    });

  const chooseFolder = () =>
    run(async () => {
      const uri = await pickBackupFolder();
      if (!uri) return 'Kein Ordner gewählt.';
      await store.setKV(AUTO_BACKUP_FOLDER_KEY, uri);
      setFolder(uri);
      await writeAutomaticBackup(uri, await store.exportBackupText());
      return 'Ordner gespeichert. Erste Sicherung geschrieben.';
    });

  const backupNow = () =>
    run(async () => {
      if (!folder) return 'Bitte zuerst einen Ordner wählen.';
      await writeAutomaticBackup(folder, await store.exportBackupText());
      return 'Sicherung geschrieben.';
    });

  return (
    <Screen>
      <SectionLabel>Backup</SectionLabel>
      <Card>
        <Muted>Eine Datei mit Trainings, Läufen, Gewicht, Schritten und Plänen. Das Format ist mit dem der alten App kompatibel.</Muted>
        <View style={{ gap: 8, marginTop: 8 }}>
          <Button label="Backup erstellen" variant="primary" onPress={exportBackup} />
          <Button label="Backup wiederherstellen" onPress={importBackup} />
        </View>
      </Card>

      <SectionLabel>Automatische Sicherung</SectionLabel>
      <Card>
        <Muted>
          {folder
            ? 'Nach jedem Training und Lauf wird Latest.json plus die letzten 7 Stände in den Ordner geschrieben.'
            : 'Wähle einen Ordner (zum Beispiel in iCloud Drive), dann sichert die App nach jedem Training und Lauf von selbst.'}
        </Muted>
        <View style={{ gap: 8, marginTop: 8 }}>
          <Button label={folder ? 'Ordner ändern' : 'Ordner wählen'} onPress={chooseFolder} />
          {folder ? <Button label="Jetzt sichern" onPress={backupNow} /> : null}
        </View>
      </Card>

      <SectionLabel>Export für Analyse</SectionLabel>
      <Card>
        <Muted>Getrennt vom Backup: Diagnosedaten und Lauf-Strecken für den Vergleich mit anderen Apps.</Muted>
        <View style={{ gap: 8, marginTop: 8 }}>
          <Button label="Alle Tracking-Daten exportieren" onPress={exportAll} />
          <Button label="Letzten Lauf als GPX exportieren" onPress={exportGpx} />
        </View>
      </Card>

      {message ? (
        <Text style={{ color: colors.text, fontSize: 14, textAlign: 'center' }}>{message}</Text>
      ) : null}
    </Screen>
  );
}
