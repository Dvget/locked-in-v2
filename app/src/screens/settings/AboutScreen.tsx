import Constants from 'expo-constants';
import { Text } from 'react-native';

import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Heading, Muted } from '../../components/ui';
import { colors } from '../../theme';

export function AboutScreen() {
  const version = Constants.expoConfig?.version ?? '–';
  return (
    <Screen>
      <Heading>LOCKED IN 2</Heading>
      <Muted>Version {version}</Muted>
      <Card title="Datenhaltung">
        <Muted>Alle Daten liegen lokal auf deinem iPhone. Kein Konto, kein Server, keine laufenden Kosten. Backups legst du selbst ab.</Muted>
      </Card>
      <Card title="Datenquellen">
        <Muted>
          Schritte: Bewegungssensor des iPhones (nur abgeschlossene Tage zählen im Durchschnitt). Läufe: GPS des iPhones, gefiltert nach
          Genauigkeit und Tempo. Gewicht: manuelle Eingabe.
        </Muted>
      </Card>
      <Card title="Übungsbibliothek">
        <Muted>Die Übungsdaten stammen aus einer gemeinfreien Sammlung (Unlicense) und wurden mit deutschen Namen ergänzt.</Muted>
      </Card>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>Höhenmeter werden bewusst noch nicht berechnet.</Text>
    </Screen>
  );
}
