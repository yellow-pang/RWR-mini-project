# PR 18. GPS 기반 추천 옵션 추가

> 작성일: 2026.05.31  
> 브랜치: `feat/gps-location-sorting`  
> 작업 계획서: [docs/plans/plan-18-gps-location.md](../plans/plan-18-gps-location.md)

---

## 1. 작업 배경

초기 MVP에서는 GPS 기능을 "기존 DB 코스 중 가까운 코스 우선 정렬"로 계획했다. 하지만 RWR의 최종 목표는 현재 위치, 목표 거리, 소요 시간, 운동 유형을 바탕으로 매일 다른 걷기/조깅/러닝 코스를 자동 추천하는 것이다.

이번 PR은 실제 ORS 라우팅 연동 전 단계로, GPS 기반 추천 옵션과 Geolocation 취득/fallback 구조를 먼저 추가한다.

---

## 2. 변경 요약

| 구분      | 내용                                                                               |
| --------- | ---------------------------------------------------------------------------------- |
| 추천 방식 | 홈 화면에 `랜덤 코스` / `GPS 자동 추천` 옵션 추가                                  |
| 위치 취득 | GPS 자동 추천 선택 시 `navigator.geolocation.getCurrentPosition` 호출              |
| fallback  | 위치 허용/거부/실패 모두 현재 단계에서는 기존 DB 랜덤 추천으로 fallback            |
| 개인정보  | 사용자 위치 좌표는 서버 API 요청에 포함하지 않음                                   |
| 문서      | MVP 기준 문서의 가까운 코스 정렬 표현을 최종 목표 기준으로 보정하고 변경 사유 기록 |

---

## 3. 주요 변경 파일

| 파일                                          | 설명                                              |
| --------------------------------------------- | ------------------------------------------------- |
| `client/src/constants/recommendationModes.js` | 추천 방식 상수와 안내 메시지 추가                 |
| `client/src/utils/geolocation.js`             | Geolocation 유틸 추가                             |
| `client/src/context/CourseProvider.jsx`       | 추천 방식과 추천 메타 상태 추가                   |
| `client/src/pages/HomePage.jsx`               | GPS 추천 옵션 UI와 위치 취득 fallback 흐름 추가   |
| `client/src/pages/ResultPage.jsx`             | fallback 안내 메시지 표시 및 다시 추천 흐름 유지  |
| `client/src/index.css`                        | 추천 방식 선택 UI 스타일 추가                     |
| `docs/01-overview.md`                         | GPS 기능 방향 보정 기록 추가                      |
| `docs/03-requirements.md`                     | GPS 요구사항 보정 및 FR-25~29 추가                |
| `docs/06-data-spec.md`                        | 생성형 GPS 코스 저장 정책 보류 기록               |
| `docs/08-schedule.md`                         | Haversine 정렬 계획을 GPS 추천 옵션 기반으로 보정 |
| `docs/10-roadmap.md`                          | GPS 로드맵을 자동 코스 추천 방향으로 보정         |

---

## 4. 동작 정책

- 기본 추천 방식은 기존과 같은 DB 랜덤 추천이다.
- 사용자가 `GPS 자동 추천`을 선택한 뒤 추천 버튼을 누를 때만 위치 권한을 요청한다.
- Step 18에서는 실제 경로 생성 엔진이 없으므로 위치 취득 성공 후에도 기존 랜덤 추천으로 fallback한다.
- 위치 권한 거부 또는 취득 실패 시에도 기존 랜덤 추천으로 fallback한다.
- fallback 이유는 결과 화면 안내 메시지로 표시한다.

---

## 5. 후속 작업

1. ORS Round Trip API 키와 호출 방식 결정
2. 현재 위치와 목표 거리 기반 경로 생성
3. 카카오맵 polyline 표시
4. 생성형 코스 저장/이력 정책과 DB 스키마 확장 검토

---

## 6. 검증 결과

| 항목  | 명령                | 결과 |
| ----- | ------------------- | ---- |
| Lint  | `npm.cmd run lint`  | 성공 |
| Build | `npm.cmd run build` | 성공 |
