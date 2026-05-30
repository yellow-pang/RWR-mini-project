const COURSE_TYPES = ["walk", "jogging", "running"];

const LEGACY_COURSE_TYPE_VALUES = {
  walk: "걷기",
  jogging: "조깅",
  running: "러닝",
};

function getCourseTypeQueryValues(type) {
  return [type, LEGACY_COURSE_TYPE_VALUES[type]].filter(Boolean);
}

module.exports = {
  COURSE_TYPES,
  getCourseTypeQueryValues,
};
