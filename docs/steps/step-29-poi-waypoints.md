# Step 29. POI 기반 경유지 후보와 코스 분위기 선택

> 작성일: 2026.06.03  
> 브랜치: `feat/step-29-poi-waypoints`  
> 작업 계획서: [docs/plans/plan-29-poi-waypoints.md](../plans/plan-29-poi-waypoints.md)  
> 관련 PR 문서: [docs/pr/pr-29-poi-waypoints.md](../pr/pr-29-poi-waypoints.md)

---

## 1. 작업 목표

Kakao Local API로 주변 POI 후보를 검색하고, 이를 생성형 코스의 경유지 후보로 활용해 랜덤 코스의 납득 가능성과 품질을 높였다.

이번 Step의 핵심 기준은 아래와 같다.

- POI는 목적지가 아니라 코스 분위기 힌트로 사용
- 홈 화면에 `코스 분위기` 선택 추가
- 출발-도착 코스에 POI 경유지 후보 적용
- 순환 코스에도 POI 기반 왕복 후보 적용
- POI 실패 시 기존 랜덤 경유지 또는 ORS round trip으로 fallback
- 최종 추천 여부는 ORS 실제 거리 검증 우선
- DB 스키마, seed 데이터, 환경변수 변경 없음

---

## 2. 변경 전후 요약

| 구분           | 변경 전                    | 변경 후                                               |
| -------------- | -------------------------- | ----------------------------------------------------- |
| 경유지 후보    | 좌표 계산 기반 랜덤 경유지 | Kakao POI 후보 우선, 실패 시 기존 방식 fallback       |
| 사용자 선택    | 우회 강도까지만 선택       | 코스 분위기 선택 추가                                 |
| POI 의미       | 없음                       | 목적지가 아니라 분위기/경유 후보 힌트                 |
| 출발-도착 코스 | 랜덤 offset 경유지         | POI 후보를 먼저 시도하고 기존 랜덤 경유지 fallback    |
| 순환 코스      | ORS round trip 후보        | POI 왕복 후보를 먼저 시도하고 ORS round trip fallback |
| 결과 설명      | 목표 거리/시간 중심        | POI 분위기 근거 추가                                  |

---

## 3. 중요 변경 내용

### 3.1 코스 분위기 UI

홈 화면에 `코스 분위기` 선택을 추가했다.

| 표시        | 내부 값       | 의미                                   |
| ----------- | ------------- | -------------------------------------- |
| 아무거나    | `any`         | 랜덤 후보와 주변 장소를 함께 활용      |
| 공원 위주   | `park`        | 공원이나 녹지 근처를 지나는 느낌       |
| 하천/산책로 | `trail`       | 걷기 좋은 길 주변을 우선 탐색          |
| 카페 근처   | `cafe`        | 카페 방문 강제가 아니라 밝은 상권 느낌 |
| 편의점 근처 | `convenience` | 물을 살 수 있는 길 느낌                |

문구는 사용자가 특정 장소 방문을 강요받는 느낌이 들지 않도록 `코스 분위기를 만드는 힌트`로 설명했다.

### 3.2 Kakao Local POI 검색

서버에 `poiService`를 추가했다. 기존 `KAKAO_REST_API_KEY`를 재사용하며, 클라이언트에 REST API 키를 노출하지 않는다.

POI 검색은 Kakao Local 키워드 검색을 사용한다. 출발-도착 코스는 출발지, 중간점, 도착지를 검색 중심점으로 사용하고, 순환 코스는 출발지를 검색 중심점으로 사용한다.

### 3.3 출발-도착 코스 적용

출발-도착 코스는 POI 후보를 `[출발지, POI, 도착지]` ORS Directions 후보로 먼저 생성한다.

POI 후보가 없거나, Kakao API가 실패하거나, POI 기반 후보가 목표 거리 검증을 통과하지 못하면 기존 랜덤 경유지 방식으로 fallback한다.

### 3.4 순환 코스 적용

순환 코스는 POI 후보를 `[출발지, POI, 출발지]` ORS Directions 후보로 먼저 생성한다.

POI 기반 왕복 후보가 목표 거리 검증을 통과하지 못하면 기존 ORS `round_trip` 후보 생성으로 fallback한다.

### 3.5 결과 표시

생성형 코스에 `poiSummary`를 포함할 수 있게 했다. 결과 카드에서는 POI가 사용된 경우 `코스 분위기` 설명을 보여준다.

POI가 사용되지 못한 경우에도 fallback 이유를 표시해 사용자가 기존 랜덤 방식으로 생성되었음을 이해할 수 있게 했다.

---

## 4. 변경 파일 상세

| 구분 | 파일                                         | 변경 내용                                        |
| ---- | -------------------------------------------- | ------------------------------------------------ |
| 수정 | `client/src/constants/courseOptions.js`      | 코스 분위기 옵션 추가                            |
| 수정 | `client/src/context/CourseProvider.jsx`      | `routeTheme` 상태 추가                           |
| 수정 | `client/src/pages/HomePage.jsx`              | 코스 분위기 선택 UI 추가                         |
| 수정 | `client/src/pages/ResultPage.jsx`            | 다시 추천 시 `routeTheme` 유지                   |
| 수정 | `client/src/components/CourseCard.jsx`       | POI 코스 분위기 설명 표시                        |
| 수정 | `client/src/api/routes.js`                   | 생성형 경로 요청에 `routeTheme` 포함             |
| 신규 | `server/src/constants/poiCategories.js`      | RWR 테마와 Kakao 검색 키워드 매핑                |
| 신규 | `server/src/services/poiService.js`          | Kakao Local POI 검색 서비스                      |
| 수정 | `server/src/routes/routes.js`                | `routeTheme` 검증 추가                           |
| 수정 | `server/src/controllers/routesController.js` | `routeTheme` 전달과 POI meta 반영                |
| 수정 | `server/src/services/orsService.js`          | POI 후보 기반 경유지 생성 및 fallback            |
| 수정 | `docs/03-requirements.md`                    | Step 29 요구사항 보정 기록 추가                  |
| 수정 | `docs/06-data-spec.md`                       | `routeTheme`, `poiSummary` 데이터 보정 기록 추가 |
| 수정 | `docs/plans/plan-29-poi-waypoints.md`        | 상태를 구현 완료로 갱신                          |
| 신규 | `docs/steps/step-29-poi-waypoints.md`        | 구현 완료 문서 작성                              |
| 신규 | `docs/pr/pr-29-poi-waypoints.md`             | PR 요약 문서 작성                                |

---

## 5. 변경하지 않은 항목

| 항목          | 변경 여부 | 이유                                       |
| ------------- | --------- | ------------------------------------------ |
| DB 스키마     | 변경 없음 | POI 후보는 요청 단위 계산 결과             |
| seed 데이터   | 변경 없음 | 저장 DB 코스를 기준 데이터로 되살리지 않음 |
| 환경변수 이름 | 변경 없음 | 기존 `KAKAO_REST_API_KEY` 재사용           |
| Docker 설정   | 변경 없음 | 실행 구조 변경 없음                        |
| npm 패키지    | 추가 없음 | 서버 fetch와 기존 React 상태로 구현        |
| POI 영속 저장 | 변경 없음 | 위치/개인정보 정책이 필요해 후속 과제      |

---

## 6. 검증 결과

| 검증 항목                                                 | 결과 |
| --------------------------------------------------------- | ---- |
| `node --check server/src/services/poiService.js`          | 통과 |
| `node --check server/src/services/orsService.js`          | 통과 |
| `node --check server/src/controllers/routesController.js` | 통과 |
| `node --check server/src/routes/routes.js`                | 통과 |
| `npm.cmd --prefix client run lint`                        | 통과 |
| `npm.cmd --prefix client run build`                       | 통과 |

---

## 7. 남은 확인 사항

- 실제 Kakao/ORS API 키가 있는 환경에서 POI 후보 품질 확인
- `하천/산책로` 키워드가 지역별로 충분한 후보를 반환하는지 확인
- POI 검색 추가로 추천 응답 시간이 과도하게 늘지 않는지 확인
- POI 후보가 많을 때 결과가 특정 프랜차이즈 위주로 쏠리지 않는지 확인
- 향후 `피하고 싶은 장소` 또는 `조용한 길` 같은 회피 옵션 검토
