# Step 30. POI 선호 토글과 도심지 매칭 보정

> 작성일: 2026.06.03  
> 브랜치: `feat/step-30-poi-preference-toggles`  
> 작업 계획서: [docs/plans/plan-30-poi-preference-toggles.md](../plans/plan-30-poi-preference-toggles.md)  
> 관련 PR 문서: [docs/pr/pr-30-poi-preference-toggles.md](../pr/pr-30-poi-preference-toggles.md)

---

## 1. 작업 목표

Step 29의 POI 기반 경유지 후보 기능을 실제 사용 피드백에 맞춰 보정했다.

핵심 목표는 아래와 같다.

- 홈 화면의 코스 분위기 선택을 compact 토글 UI로 단순화
- 사용자가 선택하지 않아도 기본 균형 추천이 동작하도록 유지
- POI 선호는 최대 2개까지만 선택 가능하게 제한
- 편의점/카페는 Kakao Local 카테고리 검색을 우선 사용
- 카테고리 검색 결과가 없으면 키워드 검색으로 fallback
- POI 후보 실패 시 기존 랜덤 경유지 fallback 유지
- 기존 `routeTheme` 요청 호환 유지

---

## 2. 변경 전후 요약

| 구분 | 변경 전 | 변경 후 |
| ---- | ------- | ------- |
| 코스 분위기 UI | 5개 카드 중 단일 선택 | 기본 균형 안내 + 3개 토글 |
| 선택 부담 | 사용자가 하나를 골라야 하는 구조 | 선택하지 않아도 기본 추천 가능 |
| 선택 제한 | 단일 선택 | 최대 2개 토글 |
| 편의점/카페 검색 | 키워드 검색 | 카테고리 검색 우선, 키워드 fallback |
| 공원/녹지 검색 | 키워드 검색 | 키워드 검색 유지 |
| 요청 데이터 | `routeTheme` | `routeTheme` + `poiPreferences` |
| 구버전 호환 | `routeTheme` 기반 | `routeTheme` 기반 요청도 내부 선호로 변환 |

---

## 3. 중요 변경 내용

### 3.1 홈 화면 compact 토글

홈 화면의 `코스 분위기` 영역을 아래 구조로 바꿨다.

```text
코스 분위기
추천 균형 코스

[공원/녹지] [카페 근처] [편의점 근처]
```

토글은 항상 보이지만 3개만 노출되므로 Step 29의 카드형 5개 옵션보다 세로 길이가 줄어든다.

### 3.2 최대 2개 선택 제한

`poiPreferences`는 최대 2개까지만 선택할 수 있다.

제한 이유는 아래와 같다.

- 사용자의 선택 부담 감소
- Kakao Local API 호출 수 제어
- 서로 다른 선호가 과하게 충돌하는 상황 방지

### 3.3 Kakao 카테고리 검색 우선

서버의 `poiService`에 Kakao Local category search를 추가했다.

검색 전략은 아래와 같다.

| 선호 | 우선 검색 | fallback |
| ---- | --------- | -------- |
| 공원/녹지 | 키워드 `공원`, `녹지` | 없음 |
| 카페 근처 | 카테고리 `CE7` | 키워드 `카페` |
| 편의점 근처 | 카테고리 `CS2` | 키워드 `편의점` |

카테고리 검색 결과가 있으면 키워드 검색을 추가로 실행하지 않는다. 결과가 없을 때만 키워드 검색으로 fallback한다.

### 3.4 서버 호환 처리

기존 클라이언트나 테스트가 `routeTheme`만 보내더라도 서버가 계속 처리할 수 있게 했다.

```text
routeTheme = park        -> poiPreferences = ["park"]
routeTheme = cafe        -> poiPreferences = ["cafe"]
routeTheme = convenience -> poiPreferences = ["convenience"]
```

새 클라이언트는 기본적으로 `routeTheme: "any"`를 유지하고, 사용자가 켠 토글을 `poiPreferences`로 보낸다.

### 3.5 결과 설명

`poiSummary`에 `poiPreferences`와 `preferenceLabels`를 포함할 수 있게 했다.

결과 카드에서는 선택한 선호가 있으면 `아무거나` 대신 `공원/녹지`, `카페 근처`, `편의점 근처` 같은 실제 선호 이름을 우선 표시한다.

---

## 4. 변경 파일 상세

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
| 신규 | `docs/steps/step-30-poi-preference-toggles.md` | 구현 완료 문서 작성 |
| 신규 | `docs/pr/pr-30-poi-preference-toggles.md` | PR 요약 문서 작성 |

---

## 5. 변경하지 않은 항목

| 항목 | 변경 여부 | 이유 |
| ---- | --------- | ---- |
| DB 스키마 | 변경 없음 | POI 선호와 후보는 요청 단위 계산 데이터 |
| seed 데이터 | 변경 없음 | 저장 DB 코스를 기준 데이터로 되살리지 않음 |
| 환경변수 이름 | 변경 없음 | 기존 `KAKAO_REST_API_KEY` 재사용 |
| Docker 설정 | 변경 없음 | 실행 구조 변경 없음 |
| npm 패키지 | 추가 없음 | 기존 fetch와 React 상태로 구현 |
| POI 캐싱 | 변경 없음 | 후속 성능 개선 과제로 분리 |
| 하천/산책로 토글 | 변경 없음 | 지역별 검색 품질 편차가 커서 후속 보정 |

---

## 6. 검증 결과

| 검증 항목 | 결과 |
| --------- | ---- |
| `node --check server/src/services/poiService.js` | 통과 |
| `node --check server/src/services/orsService.js` | 통과 |
| `node --check server/src/constants/poiCategories.js` | 통과 |
| `node --check server/src/controllers/routesController.js` | 통과 |
| `node --check server/src/routes/routes.js` | 통과 |
| `npm.cmd --prefix client run lint` | 통과 |
| `npm.cmd --prefix client run build` | 통과 |

---

## 7. 남은 확인 사항

- 실제 Kakao/ORS API 키가 있는 환경에서 서울 도심 편의점/카페 매칭 품질 확인
- POI 검색 호출 수 증가가 추천 응답 시간에 미치는 영향 확인
- 공원/녹지 키워드가 지역별로 충분히 동작하는지 확인
- `하천/산책로`, `대중교통 근처` 같은 후속 토글 후보 검토
- 결과 카드에서 fallback 문구가 사용자에게 과하게 기술적으로 보이지 않는지 확인

---

## 8. 추가 보정

사용 확인 후 아래 내용을 추가로 반영했다.

- 결과 화면 진입 시 스크롤을 상단으로 이동해 지도가 먼저 보이게 했다.
- POI 이름을 직접 문구에 노출하지 않고, `주변 장소 후보`를 참고했다는 표현으로 변경했다.
- POI 후보를 ORS에 넣기 전에 seed 기반으로 섞어, 테마 선택 시 같은 주변 장소가 반복되는 느낌을 줄였다.
