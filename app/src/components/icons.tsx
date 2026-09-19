// Simple system-like icons drawn with react-native-svg (D-034). Filled glyphs like the legacy Home screen.
import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

type IconProps = { color: string; size?: number };

export function PlayIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5z" fill={color} />
    </Svg>
  );
}

export function DumbbellIcon({ color, size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x={2} y={9} width={4.5} height={14} rx={2.2} fill={color} />
      <Rect x={7.5} y={5} width={5} height={22} rx={2.5} fill={color} />
      <Rect x={12} y={14.2} width={8} height={3.6} rx={1.2} fill={color} />
      <Rect x={19.5} y={5} width={5} height={22} rx={2.5} fill={color} />
      <Rect x={25.5} y={9} width={4.5} height={14} rx={2.2} fill={color} />
    </Svg>
  );
}

export function RunnerIcon({ color, size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={19.5} cy={5.5} r={3} fill={color} />
      <Path
        d="M14 10.5l-4.2 2.6a1.6 1.6 0 0 0 1.6 2.8l2.8-1.7 2 2.7-3.4 5.1-4.3 1.6a1.6 1.6 0 1 0 1.1 3l5-1.9a2 2 0 0 0 1-.8l2.2-3.3 2.6 2.4v5a1.6 1.6 0 0 0 3.2 0v-6a2 2 0 0 0-.6-1.4l-2.4-2.3 1.2-3.6 3.3.7a1.6 1.6 0 1 0 .6-3.1l-4.9-1a2.6 2.6 0 0 0-2.9 1.4L15.6 11.6a1.9 1.9 0 0 0-1.6-1.1z"
        fill={color}
      />
    </Svg>
  );
}

export function StepsIcon({ color, size = 34 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Ellipse cx={10.5} cy={12} rx={4.6} ry={7} fill={color} />
      <Rect x={7} y={21} width={7.6} height={5} rx={2.4} fill={color} />
      <Ellipse cx={21.5} cy={17} rx={4.6} ry={7} fill={color} />
      <Rect x={18} y={26} width={7.6} height={4} rx={2} fill={color} />
    </Svg>
  );
}

export function WeightIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M11 9.5a5 5 0 1 1 10 0" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <Path d="M8.5 12h15l3.2 14.2a1.5 1.5 0 0 1-1.5 1.8H6.8a1.5 1.5 0 0 1-1.5-1.8L8.5 12z" fill={color} />
    </Svg>
  );
}

/** Stylised "LI" mark of the brand header. */
export function LogoMark({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size * 1.3} height={size} viewBox="0 0 34 26">
      <Path d="M9.5 2h5.4L11.4 19.6H19l-.9 4.4H4.8z" fill={color} />
      <Path d="M24 2h5.6L25.6 24H20z" fill={color} />
    </Svg>
  );
}

export function HomeTabIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M16 3.5l-13 11.2a1.4 1.4 0 0 0 .9 2.4H6v10.4a1.5 1.5 0 0 0 1.5 1.5h5.3v-8h6.4v8h5.3a1.5 1.5 0 0 0 1.5-1.5V17.1h2.1a1.4 1.4 0 0 0 .9-2.4z" fill={color} />
    </Svg>
  );
}

export function ChartTabIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Path d="M4 4v22a2 2 0 0 0 2 2h22" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M8.5 21l6-7 4.5 4.5 8-10" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M21.5 8.5h6v6" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function GearTabIcon({ color, size = 30 }: IconProps) {
  const teeth = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={9} fill={color} />
      {teeth.map((deg) => (
        <Rect key={deg} x={13.6} y={2} width={4.8} height={7} rx={1.6} fill={color} transform={`rotate(${deg} 16 16)`} />
      ))}
      <Circle cx={16} cy={16} r={3.6} fill="#000" />
    </Svg>
  );
}

const stroke = (color: string, w = 2.4) => ({
  stroke: color,
  strokeWidth: w,
  fill: 'none' as const,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
});

export function MinusIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12h14" {...stroke(color, 2.6)} />
    </Svg>
  );
}

export function PlusIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 12h14M12 5v14" {...stroke(color, 2.6)} />
    </Svg>
  );
}

export function PencilIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19l-4 1z" {...stroke(color, 2)} />
    </Svg>
  );
}

export function TrashIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" {...stroke(color, 2)} />
    </Svg>
  );
}

export function EllipsisIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={5} cy={12} r={2} fill={color} />
      <Circle cx={12} cy={12} r={2} fill={color} />
      <Circle cx={19} cy={12} r={2} fill={color} />
    </Svg>
  );
}

export function CheckIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 12.5l5 5L19.5 6.5" {...stroke(color, 3)} />
    </Svg>
  );
}

export function ChevronLeftIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 5l-7 7 7 7" {...stroke(color, 2.6)} />
    </Svg>
  );
}

export function ChevronRightIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5l7 7-7 7" {...stroke(color, 2.6)} />
    </Svg>
  );
}

export function ResetIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 12a8 8 0 1 0 2.5-5.8L4 8.5M4 4v4.5h4.5" {...stroke(color, 2.2)} />
    </Svg>
  );
}

export function DriveIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x={3} y={9} width={26} height={14} rx={4} fill={color} />
      <Circle cx={23.5} cy={16} r={1.8} fill="#000" />
      <Rect x={7} y={14.6} width={9} height={2.8} rx={1.4} fill="#000" opacity={0.6} />
    </Svg>
  );
}

export function InfoIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={13} fill={color} />
      <Circle cx={16} cy={9.8} r={1.9} fill="#000" />
      <Rect x={14.3} y={13.5} width={3.4} height={10} rx={1.7} fill="#000" />
    </Svg>
  );
}

export function TargetIcon({ color, size = 30 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Circle cx={16} cy={16} r={12.5} stroke={color} strokeWidth={3} fill="none" />
      <Circle cx={16} cy={16} r={6.5} stroke={color} strokeWidth={3} fill="none" />
      <Circle cx={16} cy={16} r={2} fill={color} />
    </Svg>
  );
}

export function PauseIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5.5} y={4} width={4.5} height={16} rx={1.6} fill={color} />
      <Rect x={14} y={4} width={4.5} height={16} rx={1.6} fill={color} />
    </Svg>
  );
}

export function StopIcon({ color, size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={5} y={5} width={14} height={14} rx={2.6} fill={color} />
    </Svg>
  );
}

export function SpeakerIcon({ color, size = 22, muted = false }: IconProps & { muted?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill={color} />
      {muted ? (
        <Path d="M15.5 9.5l5 5M20.5 9.5l-5 5" {...stroke(color, 2.2)} />
      ) : (
        <>
          <Path d="M15.5 9a4 4 0 0 1 0 6" {...stroke(color, 2.2)} />
          <Path d="M18 6.5a7.5 7.5 0 0 1 0 11" {...stroke(color, 2.2)} />
        </>
      )}
    </Svg>
  );
}

export function LocationIcon({ color, size = 50, filled = true }: IconProps & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M20.5 3.5L3.8 10.6a.8.8 0 0 0 .1 1.5l6.6 2.3a.8.8 0 0 1 .5.5l2.3 6.6a.8.8 0 0 0 1.5.1z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function TimerIcon({ color, size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={13.5} r={7.5} {...stroke(color, 2.2)} />
      <Path d="M12 13.5V9M9.5 3h5" {...stroke(color, 2.2)} />
    </Svg>
  );
}

export function BigCheckIcon({ color, size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4.5 12.5l5 5L19.5 6.5" {...stroke(color, 3.4)} />
    </Svg>
  );
}

export function ClockIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5M3.5 4v4.5H8" {...stroke(color, 2)} />
      <Path d="M12 7.5V12l3 2" {...stroke(color, 2)} />
    </Svg>
  );
}

export function ListIcon({ color, size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 6.5h12M8 12h12M8 17.5h12" {...stroke(color, 2.2)} />
      <Circle cx={4} cy={6.5} r={1.3} fill={color} />
      <Circle cx={4} cy={12} r={1.3} fill={color} />
      <Circle cx={4} cy={17.5} r={1.3} fill={color} />
    </Svg>
  );
}
