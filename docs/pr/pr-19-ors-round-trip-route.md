# PR #19. ORS Round Trip 기반 GPS 경로 생성

> 관련 작업 계획서: [docs/plans/plan-19-ors-round-trip-route.md](../plans/plan-19-ors-round-trip-route.md)  
> 관련 Step 문서: [docs/steps/step-19-ors-round-trip-route.md](../steps/step-19-ors-round-trip-route.md)

---

## 브랜치 정보

| 항목        | 값                          |
| ----------- | --------------------------- |
| 작업 브랜치 | `feat/ors-round-trip-route` |
| 병합 대상   | `dev`                       |
| 상태        | 진행 중                     |

---

## PR 제목

```text
[Step 19] ORS Round Trip 기반 GPS 경로 생성
```

---

## 개요

Step 18에서 추가한 `GPS 자동 추천` 옵션을 실제 경로 생성 흐름으로 연결했다.

클라이언트가 ORS API key를 직접 들고 호출하지 않도록 Express 서버 프록시를 추가했다.
서버는 `ORS_API_KEY` 환경변수를 사용해 openrouteservice Directions API의 Round Trip 요청을 수행하고,
클라이언트는 생성된 GeoJSON LineString을 카카오맵 polyline으로 표시한다.

ORS API key 미설정, 위치 권한 실패, ORS 호출 실패 시에는 기존 PostgreSQL 랜덤 코스 추천으로 fallback한다.

---

## 변경 파일 목록

| 구분 | 파일                                          | 변경 내용                                         |
| ---- | --------------------------------------------- | ------------------------------------------------- |
| 신규 | `server/src/routes/routes.js`                 | `POST /api/routes/round-trip` 라우트 추가         |
| 신규 | `server/src/controllers/routesController.js`  | ORS round trip 요청 검증 및 응답 처리             |
| 신규 | `server/src/services/orsService.js`           | ORS Directions API 프록시 호출 및 응답 변환       |
| 수정 | `server/src/app.js`                           | `/api/routes` 라우터 등록                         |
| 신규 | `client/src/api/routes.js`                    | round trip 경로 생성 API 함수 추가                |
| 수정 | `client/src/pages/HomePage.jsx`               | GPS 자동 추천 시 ORS 경로 생성 요청 연결          |
| 수정 | `client/src/pages/ResultPage.jsx`             | 다시 추천 시 ORS seed 변경 경로 생성 연결         |
| 수정 | `client/src/components/MapView.jsx`           | GeoJSON 좌표 기반 카카오맵 polyline 표시 지원     |
| 수정 | `client/src/components/CourseCard.jsx`        | 생성형 GPS 코스 표시 및 즐겨찾기 버튼 비활성 처리 |
| 수정 | `client/src/pages/DetailPage.jsx`             | 생성형 GPS 코스 상세 화면에서 polyline 표시       |
| 수정 | `client/src/constants/recommendationModes.js` | GPS 추천 안내 문구를 실제 경로 생성 기준으로 보정 |
| 신규 | `docs/plans/plan-19-ors-round-trip-route.md`  | Step 19 작업 계획서 작성                          |

---

## 변경 이유

RWR의 장기 방향은 현재 위치, 목표 거리, 소요 시간, 운동 유형을 바탕으로 매일 다른 운동 코스를 자동 추천하는 것이다.

Step 18에서는 GPS 추천 옵션만 추가하고 실제 경로 생성은 기존 DB 랜덤 추천으로 fallback했다. Step 19에서는 ORS Round Trip API를 서버 프록시로 연결해 실제 도로망 기반 순환 경로를 생성하도록 확장했다.

Express 서버 프록시를 선택한 이유는 이미 배포까지 진행 중인 서비스이기 때문이다. 클라이언트 직접 호출은 API key가 브라우저 번들에 노출되므로 운영 배포에는 적합하지 않다.

---

## 동작 설명

- `GPS 자동 추천` 선택 시 Geolocation API로 현재 위치를 가져온다.
- 클라이언트는 `/api/routes/round-trip`으로 현재 위치와 조건을 전송한다.
- 서버는 `ORS_API_KEY`로 ORS Directions Round Trip API를 호출한다.
- ORS 응답의 `LineString` 좌표를 생성형 코스 데이터로 변환한다.
- 결과 화면 지도는 해당 좌표를 카카오맵 polyline으로 표시한다.
- ORS 실패 시 기존 `GET /api/courses/random` 추천으로 fallback한다.
- 생성형 GPS 코스는 아직 DB에 저장하지 않으므로 즐겨찾기/최근 이력 저장 대상에서 제외한다.

---

## API Key 정책

- ORS token은 https://account.heigit.org/manage/key 에서 확인한다.
- 최신 토큰 관리 페이지에서는 가입과 동시에 `basic` token이 자동 생성된다.
- 서버 실행 환경에 `ORS_API_KEY=basic_token_value`를 설정한다.
- 클라이언트에는 `VITE_ORS_API_KEY`를 사용하지 않는다.

---

## 검증

```powershell
node --check server/src/services/orsService.js
node --check server/src/controllers/routesController.js
node --check server/src/routes/routes.js
cd client
npm.cmd run lint
npm.cmd run build
```

| 항목                     | 결과                          |
| ------------------------ | ----------------------------- |
| 서버 신규 파일 문법 검사 | 성공                          |
| Lint                     | 성공                          |
| Build                    | 성공                          |
| ORS 실호출               | 미실행 (`ORS_API_KEY` 미설정) |

---

## 후속 작업

- 로컬/배포 환경에 `ORS_API_KEY` 설정
- 실제 ORS 응답으로 GPS 자동 추천 수동 검증
- 생성형 코스 즐겨찾기/이력 저장 정책 결정
- ORS quota/장애 대응 UI 고도화
