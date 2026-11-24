export type ServerRegion =
  | 'ALL SERVER'
  | 'MEXICO'
  | 'INDIA'
  | 'BANGLADESH'
  | 'BRAZIL'
  | 'OTHER SERVER';

export type MarkerStyle =
  | 'PHANTOM'
  | 'DREAM'
  | 'ICE WALL'
  | 'MOCO'
  | 'CLU'
  | 'SHIROU'
  | 'IRIS'
  | 'DREKI';

export type AimScaleLevel = {
  labelKey: 'HEAD' | 'NECK' | 'SHOULDERS' | 'UPPER CHEST' | 'CHEST';
  percent: number;
};

export type BanRiskLevel = 'off' | 'safe' | 'medium' | 'high' | 'extreme';

export const TOTAL_PLAN_SECONDS = 259200; // 3 Days (72 hours)
export const INITIAL_REMAINING_SECONDS = 252082; // 70h 01m 22s

export const SERVER_OPTIONS: { id: ServerRegion; label: string }[] = [
  { id: 'ALL SERVER', label: 'ALL SERVER' },
  { id: 'MEXICO', label: 'Mexico' },
  { id: 'INDIA', label: 'INDIA' },
  { id: 'BANGLADESH', label: 'BANGLADESH' },
  { id: 'BRAZIL', label: 'BRAZIL' },
  { id: 'OTHER SERVER', label: 'OTHER SERVER' },
];

export const MARKER_STYLES: MarkerStyle[] = [
  'PHANTOM',
  'DREAM',
  'ICE WALL',
  'MOCO',
  'CLU',
  'SHIROU',
  'IRIS',
  'DREKI',
];

export const AIM_SCALE_LEVELS: AimScaleLevel[] = [
  { labelKey: 'HEAD', percent: 100 },
  { labelKey: 'NECK', percent: 68 },
  { labelKey: 'SHOULDERS', percent: 50 },
  { labelKey: 'UPPER CHEST', percent: 30 },
  { labelKey: 'CHEST', percent: 0 },
];

export const SPEED_PRESETS = [10, 11, 12, 13, 14, 15] as const;

export function formatCountdown(totalSeconds: number): {
  hours: string;
  minutes: string;
  seconds: string;
} {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  return {
    hours: String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
    seconds: String(s).padStart(2, '0'),
  };
}

export function getRingDashOffset(
  remainingSeconds: number,
  totalSeconds: number = TOTAL_PLAN_SECONDS,
): number {
  if (totalSeconds <= 0) return 100;
  const ratio = Math.min(1, Math.max(0, remainingSeconds / totalSeconds));
  return Number(((1 - ratio) * 100).toFixed(5));
}

export function getSubscriptionRingOffset(
  isPermanent: boolean,
  remainingSeconds: number,
  totalSeconds: number = TOTAL_PLAN_SECONDS,
): number {
  if (isPermanent) return 0;
  return getRingDashOffset(remainingSeconds, totalSeconds);
}

export function clampAimHeight(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getAimTargetZone(percent: number): {
  labelKey: AimScaleLevel['labelKey'];
  markerTopPercent: number;
} {
  const p = clampAimHeight(percent);
  let labelKey: AimScaleLevel['labelKey'] = 'CHEST';
  if (p >= 85) {
    labelKey = 'HEAD';
  } else if (p >= 60) {
    labelKey = 'NECK';
  } else if (p >= 40) {
    labelKey = 'SHOULDERS';
  } else if (p >= 15) {
    labelKey = 'UPPER CHEST';
  }

  // Smoothly interpolate crosshair top between 62% (CHEST, 0%) and 14% (HEAD, 100%)
  const markerTopPercent = Number((62 - (p / 100) * 48).toFixed(2));
  return { labelKey, markerTopPercent };
}

export function getBanRisk(
  enabled: boolean,
  percent: number,
): {
  level: BanRiskLevel;
  fillPercent: number;
} {
  const p = clampAimHeight(percent);
  if (!enabled) {
    return { level: 'off', fillPercent: p };
  }
  if (p >= 85) {
    return { level: 'extreme', fillPercent: p };
  }
  if (p >= 61) {
    return { level: 'high', fillPercent: p };
  }
  if (p >= 36) {
    return { level: 'medium', fillPercent: p };
  }
  return { level: 'safe', fillPercent: p };
}

export function formatSpeedMultiplier(speedTenths: number): string {
  const clamped = Math.min(15, Math.max(10, Math.round(speedTenths)));
  return `×${(clamped / 10).toFixed(1)}`;
}

export function getSpeedFillPercent(speedTenths: number): number {
  const clamped = Math.min(15, Math.max(10, Math.round(speedTenths)));
  return ((clamped - 10) / 5) * 100;
}
