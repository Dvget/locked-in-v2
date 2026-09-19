import Svg, { Path, Rect } from 'react-native-svg';

type Props = {
  name: 'Dashboard' | 'Progress' | 'Settings';
  color: string;
  size?: number;
};

/** Simple system-like footer icons (D-034), drawn once so no icon library is needed. */
export function TabIcon({ name, color, size = 30 }: Props) {
  const common = { stroke: color, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'Dashboard' ? (
        <>
          <Rect x={3.5} y={3.5} width={7} height={7} rx={2} {...common} />
          <Rect x={13.5} y={3.5} width={7} height={7} rx={2} {...common} />
          <Rect x={3.5} y={13.5} width={7} height={7} rx={2} {...common} />
          <Rect x={13.5} y={13.5} width={7} height={7} rx={2} {...common} />
        </>
      ) : null}
      {name === 'Progress' ? (
        <>
          <Path d="M3.5 20.5h17" {...common} />
          <Path d="M4.5 16l5-5 3.5 3.5 6.5-8" {...common} />
          <Path d="M15.5 6.5h4v4" {...common} />
        </>
      ) : null}
      {name === 'Settings' ? (
        <>
          <Path d="M4 7h9M17 7h3M4 17h3M11 17h9M4 12h3M11 12h9" {...common} />
          <Path d="M13 5v4M9 15v4M9 10v4" {...common} />
        </>
      ) : null}
    </Svg>
  );
}
