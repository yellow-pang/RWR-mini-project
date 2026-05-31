export const RECOMMENDATION_MODES = {
  RANDOM_DB: "random_db",
  GPS_ROUTE: "gps_route",
};

export const RECOMMENDATION_MODE_OPTIONS = [
  {
    value: RECOMMENDATION_MODES.RANDOM_DB,
    label: "랜덤 코스",
    description: "저장된 코스 중 조건에 맞게 추천",
  },
  {
    value: RECOMMENDATION_MODES.GPS_ROUTE,
    label: "GPS 자동 추천",
    description: "현재 위치에서 순환 경로 생성",
  },
];

export const GPS_FALLBACK_NOTICE =
  "GPS 경로 생성이 원활하지 않아 기존 랜덤 코스로 추천했습니다.";

export const GPS_PERMISSION_FALLBACK_NOTICE =
  "위치 확인을 사용할 수 없어 기존 랜덤 코스로 추천했습니다.";

export const GPS_ROUTE_NOTICE =
  "현재 위치를 기준으로 실제 도로망을 따라 순환 코스를 생성했습니다.";
