import { useState } from 'react';
import { Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Button, Muted, SectionLabel, Segmented, Stepper } from '../../components/ui';
import { useStore } from '../../data/store';
import type { WeightDirection } from '../../data/repository';
import { requestStepPermission, stepsAvailable, syncSteps } from '../../native/steps';
import { colors } from '../../theme';

export function GoalsScreen() {
  const store = useStore();
  const { settings, updateSettings } = store;
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  return (
    <Screen>
      <View style={{ gap: 6 }}>
        <SectionLabel>Gewichtsrichtung</SectionLabel>
        <Segmented<WeightDirection>
          options={[
            { value: 'lose', label: 'Abnehmen' },
            { value: 'maintain', label: 'Halten' },
            { value: 'gain', label: 'Zunehmen' },
          ]}
          value={settings.weightDirection}
          onChange={(v) => updateSettings({ weightDirection: v })}
        />
        <Muted>Die Richtung bestimmt nur, wie Gewichtsänderungen eingefärbt werden. Sie gibt keine Ratschläge.</Muted>
      </View>

      <SectionLabel>Wochenziele</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stepper
          title="Trainings"
          value={String(settings.workoutsPerWeek)}
          unit="/ Woche"
          onMinus={() => updateSettings({ workoutsPerWeek: Math.max(1, settings.workoutsPerWeek - 1) })}
          onPlus={() => updateSettings({ workoutsPerWeek: Math.min(7, settings.workoutsPerWeek + 1) })}
        />
        <Stepper
          title="Läufe"
          value={String(settings.runsPerWeek)}
          unit="/ Woche"
          onMinus={() => updateSettings({ runsPerWeek: Math.max(0, settings.runsPerWeek - 1) })}
          onPlus={() => updateSettings({ runsPerWeek: Math.min(7, settings.runsPerWeek + 1) })}
        />
      </View>
      <Stepper
        title="Schritte pro Woche"
        value={Math.round(settings.weeklyStepGoal).toLocaleString('de-DE')}
        onMinus={() => updateSettings({ weeklyStepGoal: Math.max(10_000, settings.weeklyStepGoal - 5_000) })}
        onPlus={() => updateSettings({ weeklyStepGoal: settings.weeklyStepGoal + 5_000 })}
      />

      <SectionLabel>Schritte vom iPhone</SectionLabel>
      <Segmented
        options={[
          { value: 'off', label: 'Aus' },
          { value: 'on', label: 'An' },
        ]}
        value={settings.stepsEnabled ? 'on' : 'off'}
        onChange={async (v) => {
          if (v === 'off') {
            await updateSettings({ stepsEnabled: false });
            return;
          }
          if (!(await stepsAvailable())) {
            setStepMessage('Schrittzählung ist auf diesem Gerät nicht verfügbar.');
            return;
          }
          if (!(await requestStepPermission())) {
            setStepMessage('Bewegungszugriff wurde nicht erlaubt (iPhone-Einstellungen).');
            return;
          }
          await updateSettings({ stepsEnabled: true });
          const days = await syncSteps(store);
          setStepMessage(`${days} Tage gelesen.`);
        }}
      />
      {settings.stepsEnabled ? (
        <Button
          label="Jetzt synchronisieren"
          onPress={async () => setStepMessage(`${await syncSteps(store)} Tage gelesen.`)}
        />
      ) : null}
      {stepMessage ? <Muted>{stepMessage}</Muted> : null}
      <Muted>Es zählen nur abgeschlossene Tage im Durchschnitt. Das iPhone liefert bis zu 7 Tage rückwirkend.</Muted>

      <SectionLabel>Wiederholungsbereich</SectionLabel>
      <Card>
        <Text style={{ color: colors.text, fontSize: 15 }}>
          {settings.repRangeMin}–{settings.repRangeMax} Wiederholungen
        </Text>
        <Muted>Am oberen Ende in allen Sätzen erscheint der Hinweis auf mehr Gewicht. Pro Übung im Plan überschreibbar.</Muted>
      </Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stepper
          title="Von"
          value={String(settings.repRangeMin)}
          onMinus={() => updateSettings({ repRangeMin: Math.max(1, settings.repRangeMin - 1) })}
          onPlus={() => updateSettings({ repRangeMin: Math.min(settings.repRangeMax, settings.repRangeMin + 1) })}
        />
        <Stepper
          title="Bis"
          value={String(settings.repRangeMax)}
          onMinus={() => updateSettings({ repRangeMax: Math.max(settings.repRangeMin, settings.repRangeMax - 1) })}
          onPlus={() => updateSettings({ repRangeMax: Math.min(50, settings.repRangeMax + 1) })}
        />
      </View>

      <SectionLabel>Körpergewicht für Training</SectionLabel>
      <Stepper
        title="Gewicht (für Körpergewichtsübungen)"
        value={String(settings.manualBodyWeightKg).replace('.', ',')}
        unit="kg"
        onMinus={() => updateSettings({ manualBodyWeightKg: Math.max(30, Math.round((settings.manualBodyWeightKg - 0.5) * 10) / 10) })}
        onPlus={() => updateSettings({ manualBodyWeightKg: Math.round((settings.manualBodyWeightKg + 0.5) * 10) / 10 })}
      />
      <Muted>Wird beim Start eines Trainings gespeichert. Der letzte eingetragene Gewichtswert hat Vorrang.</Muted>
    </Screen>
  );
}
