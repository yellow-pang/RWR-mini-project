# PR #30. POI 선호 토글과 도심지 매칭 보정

> 관련 작업 계획서: [docs/plans/plan-30-poi-preference-toggles.md](../plans/plan-30-poi-preference-toggles.md)  
> 관련 Step 문서: [docs/steps/step-30-poi-preference-toggles.md](../steps/step-30-poi-preference-toggles.md)

---

## 브랜치 정보

| 항목 | 값 |
| ---- | -- |
| 작업 브랜치 | `feat/step-30-poi-preference-toggles` |
| 병합 대상 | `dev` |
| 상태 | 완료 |

---

## PR 제목

```text
[Step 30] POI 선호 토글과 도심지 매칭 보정
```

---

## 개요

Step 29의 코스 분위기 단일 선택 UI를 compact 토글 방식으로 바꾸고, 도심지 POI 매칭 품질을 높이기 위해 Kakao Local 카테고리 검색을 우선 적용한다.

사용자는 기본적으로 `추천 균형 코스`를 받으며, 원하는 경우 `공원/녹지`, `카페 근처`, `편의점 근처`를 최대 2개까지 추가로 선택할 수 있다. 편의점과 카페는 카테고리 검색을 먼저 사용하고, 결과가 없으면 키워드 검색으로 fallback한다. POI 후보가 부족하면 기존 랜덤 경유지 또는 ORS round trip fallback을 유지한다.

---

## 변경 파일 목록

| 구분 | 파일 | 변경 내용 |
| ---- | ---- | --------- |
| 수정 | `client/src/constants/courseOptions.js` | POI 선호 토글 옵션과 최대 선택 수 추가 |
| 수정 | `client/src/context/CourseProvider.jsx` | `poiPreferences` 상태 추가 |
| 수정 | `client/src/pages/HomePage.jsx` | 코스 분위기 compact 토글 UI 적용 |
| 수정 | `client/src/pages/ResultPage.jsx` | 다시 추천 시 `poiPreferences` 유지 |
| 수정 | `client/src/api/routes.js` | 생성형 경로 요청에 `poiPreferences` 포함 |
| 수정 | `client/src/components/CourseCard.jsx` | 선택한 POI 선호 라벨 표시 |
| 수정 | `client/src/index.css` | POI 토글 UI 스타일 추가 |
| 수정 | `server/src/constants/poiCategories.js` | POI 선호값, 라벨, 검색 전략 추가 |
| 수정 | `server/src/services/poiService.js` | 카테고리 검색 우선 + 키워드 fallback 구현 |
| 수정 | `server/src/services/orsService.js` | `poiPreferences` 기반 후보 우선순위와 요약 반영 |
| 수정 | `server/src/routes/routes.js` | `poiPreferences` 검증 추가 |
| 수정 | `server/src/controllers/routesController.js` | 출발-도착 생성에 `poiPreferences` 전달 |
| 수정 | `docs/03-requirements.md` | Step 30 요구사항 보정 기록 추가 |
| 수정 | `docs/06-data-spec.md` | `poiPreferences`, `poiSummary` 데이터 보정 기록 추가 |
| 수정 | `docs/plans/plan-30-poi-preference-toggles.md` | 구현 기록 추가 |
| 신규 | `docs/steps/step-30-poi-preference-toggles.md` | Step 완료 문서 |
| 신규 | `docs/pr/pr-30-poi-preference-toggles.md` | PR 요약 문서 |

---

## 동작 설명

- 홈 화면의 `코스 분위기`는 기본 균형 안내와 3개 토글로 표시된다.
- 토글은 최대 2개까지만 선택할 수 있다.
- 생성형 경로 요청에는 기존 `routeTheme`과 신규 `poiPreferences`가 함께 포함된다.
- 서버는 `poiPreferences`가 있으면 이를 우선 사용한다.
- 구버전 `routeTheme` 요청은 서버에서 내부 POI 선호값으로 변환해 처리한다.
- 카페와 편의점은 Kakao category search를 먼저 시도한다.
- category search 결과가 없으면 keyword search로 fallback한다.
- POI 후보가 부족하거나 목표 거리 검증을 통과하지 못하면 기존 fallback 경로를 사용한다.
- 결과 카드에는 실제 선택한 POI 선호 라벨 또는 fallback 안내가 표시된다.

---

## 검증

```powershell
node --check server/src/services/poiService.js
node --check server/src/services/orsService.js
node --check server/src/constants/poiCategories.js
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

- 실제 API 환경에서 서울 도심 편의점/카페 매칭 품질 확인
- POI 검색 호출 수 증가에 따른 응답 시간 확인
- 공원/녹지 키워드 품질 확인
- `하천/산책로`, `대중교통 근처` 같은 추가 토글 후보 검토
- POI 검색 결과 캐싱 필요성 검토

---

## 추가 보정

- 결과 화면 진입 시 스크롤을 상단으로 이동한다.
- 결과 카드의 POI 문구에서 개별 장소명을 직접 노출하지 않는다.
- POI 후보 순서를 seed 기반으로 섞어 테마 선택 시 랜덤성이 과하게 줄어드는 문제를 완화한다.
