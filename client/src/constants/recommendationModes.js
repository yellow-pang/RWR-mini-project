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
    description: "현재 위치 기반 경로 생성 준비",
  },
];

export const GPS_FALLBACK_NOTICE =
  "현재 위치는 확인했지만 실제 경로 생성은 다음 단계에서 연결됩니다. 이번 추천은 기존 코스로 보여드릴게요.";

export const GPS_PERMISSION_FALLBACK_NOTICE =
  "위치 확인을 사용할 수 없어 기존 랜덤 코스로 추천했습니다.";
