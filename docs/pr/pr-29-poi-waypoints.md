# PR #29. POI 기반 경유지 후보와 코스 분위기 선택

> 관련 작업 계획서: [docs/plans/plan-29-poi-waypoints.md](../plans/plan-29-poi-waypoints.md)  
> 관련 Step 문서: [docs/steps/step-29-poi-waypoints.md](../steps/step-29-poi-waypoints.md)

---

## 브랜치 정보

| 항목 | 값 |
| ---- | -- |
| 작업 브랜치 | `feat/step-29-poi-waypoints` |
| 병합 대상 | `dev` |
| 상태 | 완료 |

---

## PR 제목

```text
[Step 29] POI 기반 경유지 후보와 코스 분위기 선택
```

---

## 개요

Kakao Local API를 사용해 주변 POI 후보를 검색하고, 이를 생성형 코스의 경유지 후보로 활용한다. POI는 사용자가 반드시 방문해야 하는 목적지가 아니라 `공원 위주`, `하천/산책로`, `카페 근처`, `편의점 근처` 같은 코스 분위기를 만드는 힌트로 사용한다.

출발-도착 코스는 `[출발지, POI, 도착지]` 후보를 먼저 시도하고, 순환 코스는 `[출발지, POI, 출발지]` 후보를 먼저 시도한다. POI 후보가 없거나 ORS 실제 거리 검증을 통과하지 못하면 기존 랜덤 경유지 또는 ORS round trip 방식으로 fallback한다.

---

## 변경 파일 목록

| 구분 | 파일 | 변경 내용 |
| ---- | ---- | --------- |
| 수정 | `client/src/constants/courseOptions.js` | 코스 분위기 옵션 추가 |
| 수정 | `client/src/context/CourseProvider.jsx` | `routeTheme` 상태 추가 |
| 수정 | `client/src/pages/HomePage.jsx` | 코스 분위기 선택 UI 추가 |
| 수정 | `client/src/pages/ResultPage.jsx` | 다시 추천 시 `routeTheme` 유지 |
| 수정 | `client/src/components/CourseCard.jsx` | POI 코스 분위기 설명 표시 |
| 수정 | `client/src/api/routes.js` | 생성형 경로 요청에 `routeTheme` 포함 |
| 신규 | `server/src/constants/poiCategories.js` | RWR 테마와 Kakao 검색 키워드 매핑 |
| 신규 | `server/src/services/poiService.js` | Kakao Local POI 검색 서비스 |
| 수정 | `server/src/routes/routes.js` | `routeTheme` 검증 추가 |
| 수정 | `server/src/controllers/routesController.js` | `routeTheme` 전달과 POI meta 반영 |
| 수정 | `server/src/services/orsService.js` | POI 후보 기반 경유지 생성 및 fallback |
| 수정 | `docs/03-requirements.md` | Step 29 요구사항 보정 기록 추가 |
| 수정 | `docs/06-data-spec.md` | `routeTheme`, `poiSummary` 데이터 보정 기록 추가 |
| 수정 | `docs/plans/plan-29-poi-waypoints.md` | 상태를 구현 완료로 갱신 |
| 신규 | `docs/steps/step-29-poi-waypoints.md` | Step 완료 문서 |
| 신규 | `docs/pr/pr-29-poi-waypoints.md` | PR 요약 문서 |

---

## 동작 설명

- 홈 화면에서 코스 분위기를 선택한다.
- 생성형 경로 요청에 `routeTheme`을 포함한다.
- 서버는 Kakao Local API로 주변 POI 후보를 검색한다.
- POI 후보는 목적지가 아니라 ORS 경유지 후보로만 사용한다.
- 출발-도착 코스와 순환 코스 모두 POI 후보를 먼저 시도한다.
- POI 후보가 실패하면 기존 랜덤 경유지 또는 round trip 방식으로 fallback한다.
- 결과 카드에는 POI 기반 코스 분위기 설명 또는 fallback 안내가 표시된다.

---

## 검증

```powershell
node --check server/src/services/poiService.js
node --check server/src/services/orsService.js
node --check server/src/controllers/routesController.js
node --check server/src/routes/routes.js
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
```

| 항목 | 결과 |
| ---- | ---- |
| 서버 JS 문법 확인 | 성공 |
| 클라이언트 Lint | 성공 |
| 클라이언트 Build | 성공 |
| 실제 Kakao/ORS 경로 생성 | 브라우저에서 추가 확인 권장 |

---

## 후속 확인

- 실제 API 환경에서 테마별 POI 후보 품질 확인
- POI 검색으로 인한 응답 시간 증가 확인
- `하천/산책로` 키워드 보강
- 피하고 싶은 장소/조용한 길 등 회피 옵션 검토
