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

export function getTypeLabel(type) {
  return TYPE_LABELS[type] || type || "";
}

export function getTypeIconName(type) {
  return TYPE_ICON_NAMES[type] || "runner";
}

export function getMoodLabel(mood) {
  return MOOD_LABELS[mood] || mood || "";
}
