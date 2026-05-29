const TYPE_LABELS = {
  "嫄룰린": "걷기",
  "議곌퉭": "조깅",
  "?щ떇": "산책",
};

const MOOD_LABELS = {
  "怨듭썝": "공원",
  "媛뺣?": "강변",
  "?꾩떖": "도심",
  "?꿸만": "힐링",
};

export function getTypeLabel(type) {
  return TYPE_LABELS[type] || type;
}

export function getMoodLabel(mood) {
  return MOOD_LABELS[mood] || mood;
}
