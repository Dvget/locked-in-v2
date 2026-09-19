import { useEffect, useState } from 'react';

import { useStore } from '../data/store';
import { newId } from '../domain/dates';
import { Button, Field, Muted, Sheet } from './ui';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/** Manual weight entry (D-015). Defaults to the last value so small corrections are quick. */
export function WeightEntrySheet({ visible, onClose }: Props) {
  const store = useStore();
  const last = store.data.weights
    .filter((w) => !w.isHidden)
    .sort((a, b) => b.date - a.date)[0];
  const [text, setText] = useState('');

  useEffect(() => {
    if (visible) setText(last ? String(last.weightKg).replace('.', ',') : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const value = Number(text.replace(',', '.'));
  const valid = Number.isFinite(value) && value >= 20 && value <= 400;

  return (
    <Sheet visible={visible} title="Gewicht eintragen" onClose={onClose}>
      <Field label="Gewicht in kg" value={text} onChangeText={setText} keyboardType="decimal-pad" placeholder="z. B. 84,2" />
      {!valid && text.length > 0 ? <Muted>Bitte einen Wert zwischen 20 und 400 kg eingeben.</Muted> : null}
      <Button
        label="Speichern"
        variant="primary"
        disabled={!valid}
        onPress={async () => {
          await store.saveWeight({ id: newId(), date: Date.now(), weightKg: Math.round(value * 10) / 10, source: 'manual', isHidden: false });
          onClose();
        }}
      />
    </Sheet>
  );
}
