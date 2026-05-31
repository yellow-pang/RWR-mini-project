# Step 19. ORS Round Trip 기반 GPS 경로 생성

> 작성일: 2026.05.31  
> 브랜치: `feat/ors-round-trip-route`  
> 작업 계획서: [docs/plans/plan-19-ors-round-trip-route.md](../plans/plan-19-ors-round-trip-route.md)  
> 관련 PR 문서: [docs/pr/pr-19-ors-round-trip-route.md](../pr/pr-19-ors-round-trip-route.md)

---

## 1. 작업 목표

Step 18에서 추가한 `GPS 자동 추천` 옵션을 ORS Round Trip API 기반 실제 경로 생성으로 연결한다.

현재 위치와 선택 조건을 서버 프록시로 전달하고, Express 서버가 `ORS_API_KEY`를 사용해 openrouteservice Directions API를 호출한다. 생성된 경로는 카카오맵 polyline으로 표시한다.

---

## 2. 변경 내용

| 구분 | 파일                                          | 설명                                               |
| ---- | --------------------------------------------- | -------------------------------------------------- |
| 신규 | `server/src/routes/routes.js`                 | `POST /api/routes/round-trip` 라우트 추가          |
| 신규 | `server/src/controllers/routesController.js`  | 요청 검증 및 ORS 경로 생성 응답 처리               |
| 신규 | `server/src/services/orsService.js`           | ORS Directions API 호출 및 생성형 코스 데이터 변환 |
| 수정 | `server/src/app.js`                           | `/api/routes` 라우터 등록                          |
| 신규 | `client/src/api/routes.js`                    | round trip 경로 생성 API 함수 추가                 |
| 수정 | `client/src/pages/HomePage.jsx`               | GPS 자동 추천 시 ORS 경로 생성 요청 연결           |
| 수정 | `client/src/pages/ResultPage.jsx`             | 다시 추천 시 새 seed로 ORS 경로 생성               |
| 수정 | `client/src/components/MapView.jsx`           | 카카오맵 polyline 렌더링 지원                      |
| 수정 | `client/src/components/CourseCard.jsx`        | 생성형 GPS 코스 표시 및 즐겨찾기 버튼 제외         |
| 수정 | `client/src/pages/DetailPage.jsx`             | 생성형 GPS 코스 상세 지도 polyline 표시            |
| 수정 | `client/src/constants/recommendationModes.js` | GPS 추천 안내 문구 보정                            |
| 신규 | `docs/pr/pr-19-ors-round-trip-route.md`       | PR 문서 작성                                       |

---

## 3. 변경 상세

### 3.1 ORS 서버 프록시

클라이언트 직접 호출 대신 Express 서버가 ORS API를 호출한다.

```text
Client → POST /api/routes/round-trip
Server → POST https://api.openrouteservice.org/v2/directions/foot-walking/geojson
```

서버는 `process.env.ORS_API_KEY`를 사용한다. API key는 코드나 클라이언트 번들에 포함하지 않는다.

### 3.2 ORS token 발급 방식

최신 ORS/HeiGIT 토큰 관리 페이지는 아래 주소다.

```text
https://account.heigit.org/manage/key
```

현재는 가입 시 `basic` 이름의 기본 API Key(Token)가 자동 생성된다. 사용자는 해당 token을 복사해 서버 환경변수 `ORS_API_KEY`로 설정하면 된다.

### 3.3 생성형 코스 데이터

ORS GeoJSON 응답을 기존 CourseCard/ResultPage에서 표시 가능한 형태로 변환한다.

| 필드                     | 설명                        |
| ------------------------ | --------------------------- |
| `id`                     | `generated-ors-{timestamp}` |
| `source`                 | `ors`                       |
| `geometry.coordinates`   | ORS LineString 좌표         |
| `summary.distance`       | ORS 응답 거리(m)            |
| `summary.duration`       | ORS 응답 예상 시간(초)      |
| `start_lat`, `start_lng` | 경로 시작점 좌표            |

### 3.4 카카오맵 polyline

`MapView`가 `routeCoordinates`를 받을 수 있도록 확장했다.

ORS 좌표는 `[longitude, latitude]` 순서이므로 카카오맵의 `LatLng(latitude, longitude)` 생성 시 순서를 변환한다.

### 3.5 fallback

아래 상황에서는 기존 DB 랜덤 추천으로 fallback한다.

- 위치 권한 거부/실패
- `ORS_API_KEY` 미설정
- ORS API 호출 실패
- ORS 응답에 좌표가 없음

---

## 4. 개인정보 및 저장 정책

- 위치 좌표는 ORS 경로 생성을 위해 서버 프록시로 전달된다.
- 서버는 위치 좌표를 DB에 저장하지 않는다.
- 생성형 GPS 코스는 아직 즐겨찾기/최근 이력 저장 대상이 아니다.
- 즐겨찾기/이력 저장 정책은 후속 단계에서 DB 스키마 확장과 함께 결정한다.

---

## 5. 검증 결과

| 검증 항목                | 명령                | 결과                          |
| ------------------------ | ------------------- | ----------------------------- |
| 서버 신규 파일 문법 검사 | `node --check ...`  | 통과                          |
| ESLint                   | `npm.cmd run lint`  | 통과                          |
| Production build         | `npm.cmd run build` | 통과                          |
| ORS 실호출               | —                   | 미실행 (`ORS_API_KEY` 미설정) |

---

## 6. 배포/환경변수 주의사항

실제 ORS 경로 생성을 사용하려면 서버 실행 환경에 아래 값이 필요하다.

```env
ORS_API_KEY=account.heigit.org에서_확인한_basic_token
```

로컬 `.env`, Docker/배포 secret 반영은 사용자가 직접 진행한다.

---

## 7. 후속 작업

- `ORS_API_KEY` 설정 후 실제 경로 생성 수동 검증
- 배포 환경 secret 반영
- ORS quota 초과/장애 안내 UI 개선
- 생성형 GPS 코스의 즐겨찾기/이력 저장 정책 결정
