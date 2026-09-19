import { Text, View } from 'react-native';

import { Card } from '../../components/Card';
import { Screen } from '../../components/Screen';
import { Muted, SectionLabel, Segmented, Stepper } from '../../components/ui';
import { useStore } from '../../data/store';
import type { WeightDirection } from '../../data/repository';
import { colors } from '../../theme';

export function GoalsScreen() {
  const { settings, updateSettings } = useStore();
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
