import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  points: number[];
  color: string;
  height?: number;
};

const PADDING = 4;
const LINE = 2;
const DOT = 6;

// Minimal line drawn from rotated Views; no chart or SVG dependency.
export function Sparkline({ points, color, height = 44 }: Props) {
  const [width, setWidth] = useState(0);

  const coords: { x: number; y: number }[] = [];
  if (width > 0 && points.length > 1) {
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const innerW = width - PADDING * 2;
    const innerH = height - PADDING * 2;
    points.forEach((value, i) => {
      coords.push({
        x: PADDING + (innerW * i) / (points.length - 1),
        y: PADDING + innerH * (1 - (value - min) / range),
      });
    });
  }

  const last = coords[coords.length - 1];

  return (
    <View
      style={{ height, width: '100%' }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {coords.slice(1).map((to, i) => {
        const from = coords[i];
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const length = Math.hypot(dx, dy);
        return (
          <View
            key={i}
            style={[
              styles.segment,
              {
                backgroundColor: color,
                width: length,
                left: from.x + dx / 2 - length / 2,
                top: from.y + dy / 2 - LINE / 2,
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
              },
            ]}
          />
        );
      })}
      {last ? (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: color,
              left: last.x - DOT / 2,
              top: last.y - DOT / 2,
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: {
    position: 'absolute',
    height: LINE,
    borderRadius: LINE / 2,
  },
  dot: {
    position: 'absolute',
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
});
