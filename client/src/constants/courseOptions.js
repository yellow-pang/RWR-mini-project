export const TARGET_MODES = {
  DISTANCE: "distance",
  TIME: "time",
};

export const TARGET_MODE_OPTIONS = [
  { label: "거리 기준", value: TARGET_MODES.DISTANCE },
  { label: "시간 기준", value: TARGET_MODES.TIME },
];

export const DISTANCE_OPTIONS = [
  { label: "1km", value: 1 },
  { label: "2km", value: 2 },
  { label: "3km", value: 3 },
  { label: "5km", value: 5 },
  { label: "직접 설정", value: "custom" },
];

export const DISTANCE_OPTIONS_BY_TYPE = {
  walk: [
    { label: "1km", value: 1 },
    { label: "2km", value: 2 },
    { label: "3km", value: 3 },
    { label: "직접 설정", value: "custom" },
  ],
  jogging: [
    { label: "2km", value: 2 },
    { label: "3km", value: 3 },
    { label: "5km", value: 5 },
    { label: "직접 설정", value: "custom" },
  ],
  running: [
    { label: "3km", value: 3 },
    { label: "5km", value: 5 },
    { label: "7km", value: 7 },
    { label: "직접 설정", value: "custom" },
  ],
};

export const TIME_OPTIONS = [
  { label: "15분", value: 15 },
  { label: "30분", value: 30 },
  { label: "45분", value: 45 },
  { label: "60분", value: 60 },
  { label: "직접 설정", value: "custom" },
];

export const TYPE_OPTIONS = [
  { label: "걷기", value: "walk" },
  { label: "조깅", value: "jogging" },
  { label: "러닝", value: "running" },
];

export const ACTIVITY_SPEEDS_KM_PER_HOUR = {
  walk: 4,
  jogging: 7,
  running: 9,
};

export const CUSTOM_DISTANCE_RANGE = {
  min: 0.5,
  max: 10,
  step: 0.5,
  defaultValue: 4,
};

export const CUSTOM_TIME_RANGE = {
  min: 5,
  max: 120,
  step: 5,
  defaultValue: 45,
};

export const DETOUR_LEVELS = {
  LIGHT: "light",
  MEDIUM: "medium",
  STRONG: "strong",
};

export const DETOUR_LEVEL_OPTIONS = [
  {
    label: "가볍게",
    value: DETOUR_LEVELS.LIGHT,
    description: "도착지에 가까운 짧은 우회",
  },
  {
    label: "적당히",
    value: DETOUR_LEVELS.MEDIUM,
    description: "산책하듯 자연스러운 우회",
  },
  {
    label: "많이",
    value: DETOUR_LEVELS.STRONG,
    description: "목표 거리 안에서 더 돌아가기",
  },
];

export function getDistanceOptionsByType(type) {
  return DISTANCE_OPTIONS_BY_TYPE[type] || DISTANCE_OPTIONS;
}
