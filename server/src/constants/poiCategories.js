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

const POI_PREFERENCES = {
  PARK: "park",
  CAFE: "cafe",
  CONVENIENCE: "convenience",
};

const POI_PREFERENCE_VALUES = Object.values(POI_PREFERENCES);
const POI_PREFERENCE_LIMIT = 2;

const POI_PREFERENCE_LABELS = {
  [POI_PREFERENCES.PARK]: "공원/녹지",
  [POI_PREFERENCES.CAFE]: "카페 근처",
  [POI_PREFERENCES.CONVENIENCE]: "편의점 근처",
};

const POI_SEARCH_STRATEGIES = {
  [POI_PREFERENCES.PARK]: {
    categoryCodes: [],
    keywords: ["공원", "녹지"],
  },
  [POI_PREFERENCES.CAFE]: {
    categoryCodes: ["CE7"],
    keywords: ["카페"],
  },
  [POI_PREFERENCES.CONVENIENCE]: {
    categoryCodes: ["CS2"],
    keywords: ["편의점"],
  },
};

function normalizeRouteTheme(routeTheme) {
  return ROUTE_THEME_VALUES.includes(routeTheme) ? routeTheme : ROUTE_THEMES.ANY;
}

function getPoiPreferencesFromRouteTheme(routeTheme) {
  const theme = normalizeRouteTheme(routeTheme);

  if (POI_PREFERENCE_VALUES.includes(theme)) {
    return [theme];
  }

  return [];
}

function normalizePoiPreferences(poiPreferences, routeTheme) {
  const values = Array.isArray(poiPreferences) ? poiPreferences : [];
  const normalizedValues = values.filter((value, index) => {
    return (
      POI_PREFERENCE_VALUES.includes(value) && values.indexOf(value) === index
    );
  });

  const fallbackValues =
    normalizedValues.length > 0 ? normalizedValues : getPoiPreferencesFromRouteTheme(routeTheme);

  return fallbackValues.slice(0, POI_PREFERENCE_LIMIT);
}

module.exports = {
  ROUTE_THEMES,
  ROUTE_THEME_VALUES,
  ROUTE_THEME_LABELS,
  ROUTE_THEME_KEYWORDS,
  POI_PREFERENCES,
  POI_PREFERENCE_VALUES,
  POI_PREFERENCE_LIMIT,
  POI_PREFERENCE_LABELS,
  POI_SEARCH_STRATEGIES,
  normalizePoiPreferences,
  normalizeRouteTheme,
};
