const TYPE_LABELS = {
  walk: "걷기",
  jogging: "조깅",
  running: "러닝",
  걷기: "걷기",
  조깅: "조깅",
  러닝: "러닝",
};

const MOOD_LABELS = {
  park: "공원",
  river: "강변",
  city: "도심",
  forest: "숲길",
  공원: "공원",
  강변: "강변",
  도심: "도심",
  숲길: "숲길",
};

const TYPE_ICON_NAMES = {
  walk: "foot",
  jogging: "pulse",
  running: "runner",
  걷기: "foot",
  조깅: "pulse",
  러닝: "runner",
};

const ACTIVITY_SPEEDS_KM_PER_HOUR = {
  walk: 4,
  jogging: 7,
  running: 9,
};

export function getTypeLabel(type) {
  return TYPE_LABELS[type] || type || "";
}

export function getTypeIconName(type) {
  return TYPE_ICON_NAMES[type] || "runner";
}

export function getMoodLabel(mood) {
  return MOOD_LABELS[mood] || mood || "";
}

export function getActivitySpeed(type) {
  return ACTIVITY_SPEEDS_KM_PER_HOUR[type] || ACTIVITY_SPEEDS_KM_PER_HOUR.walk;
}

export function calculateEstimatedMinutes(distanceKm, type) {
  const speedKmPerHour = getActivitySpeed(type);
  return Math.round((Number(distanceKm) / speedKmPerHour) * 60);
}

export function calculateTargetDistanceKm(minutes, type) {
  const speedKmPerHour = getActivitySpeed(type);
  return Number(((speedKmPerHour * Number(minutes)) / 60).toFixed(2));
}

export function getDistanceToleranceRate(distanceKm) {
  const targetDistanceKm = Number(distanceKm);

  if (targetDistanceKm <= 1) return 0.3;
  if (targetDistanceKm <= 3) return 0.2;
  if (targetDistanceKm >= 5) return 0.15;
  return 0.2;
}

export function getDistanceRange(distanceKm) {
  const targetDistanceKm = Number(distanceKm);
  const toleranceRate = getDistanceToleranceRate(targetDistanceKm);
  const min = Math.max(0, targetDistanceKm * (1 - toleranceRate));
  const max = targetDistanceKm * (1 + toleranceRate);

  return {
    min: Number(min.toFixed(1)),
    max: Number(max.toFixed(1)),
    toleranceRate,
  };
}

export function formatDistanceKm(distanceKm) {
  const value = Number(distanceKm);
  if (!Number.isFinite(value)) return "";
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}km`;
}

export function formatMinutes(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return "";
  return `약 ${Math.round(value)}분`;
}

export function formatSignedDistanceKm(distanceKm) {
  const value = Number(distanceKm);
  if (!Number.isFinite(value)) return "";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}km`;
}
