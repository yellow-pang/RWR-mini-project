const ROUTE_THEMES = {
  ANY: "any",
  PARK: "park",
  TRAIL: "trail",
  CAFE: "cafe",
  CONVENIENCE: "convenience",
};

const ROUTE_THEME_VALUES = Object.values(ROUTE_THEMES);

const ROUTE_THEME_LABELS = {
  [ROUTE_THEMES.ANY]: "아무거나",
  [ROUTE_THEMES.PARK]: "공원 위주",
  [ROUTE_THEMES.TRAIL]: "하천/산책로",
  [ROUTE_THEMES.CAFE]: "카페 근처",
  [ROUTE_THEMES.CONVENIENCE]: "편의점 근처",
};

const ROUTE_THEME_KEYWORDS = {
  [ROUTE_THEMES.ANY]: ["공원", "산책로", "편의점"],
  [ROUTE_THEMES.PARK]: ["공원", "녹지"],
  [ROUTE_THEMES.TRAIL]: ["산책로", "하천", "둘레길"],
  [ROUTE_THEMES.CAFE]: ["카페"],
  [ROUTE_THEMES.CONVENIENCE]: ["편의점"],
};

function normalizeRouteTheme(routeTheme) {
  return ROUTE_THEME_VALUES.includes(routeTheme) ? routeTheme : ROUTE_THEMES.ANY;
}

module.exports = {
  ROUTE_THEMES,
  ROUTE_THEME_VALUES,
  ROUTE_THEME_LABELS,
  ROUTE_THEME_KEYWORDS,
  normalizeRouteTheme,
};
