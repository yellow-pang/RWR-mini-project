# Step 21. 주소 입력 중심 랜덤 경로 생성

> 작성일: 2026.06.01  
> 브랜치: `feat/step-21-address-first-routes`  
> 작업 계획서: [docs/plans/plan-21-address-first-routes.md](../plans/plan-21-address-first-routes.md)  
> 관련 PR 문서: [docs/pr/pr-21-address-first-routes.md](../pr/pr-21-address-first-routes.md)

---

## 1. 작업 목표

추천 진입 흐름을 GPS 중심에서 주소 입력 중심으로 변경한다.

사용자는 홈 화면에서 출발 주소, 거리, 소요 시간, 운동 유형을 입력한 뒤 `코스 생성` 버튼 하나로 랜덤 경로 생성을 요청한다. GPS는 주소 입력을 돕는 `현재 위치 사용` 보조 기능으로만 제공한다.

---

## 2. 변경 내용

### 2.1 클라이언트

- 홈 화면에 주소 입력칸 추가
- `현재 위치` 보조 버튼 추가
- 기존 `랜덤 코스` / `GPS 자동 추천` 추천 방식 선택 UI 제거
- `코스 생성` 단일 버튼으로 추천 시작 흐름 통합
- 결과 화면의 `다시 추천`을 이전 주소/좌표 기준으로 재생성
- 생성형 코스 배지를 `GPS 생성`에서 `주소 생성`으로 변경
- 주소 직접 입력 시 `null` 좌표를 요청에서 제외해 서버가 주소→좌표 변환을 먼저 수행하도록 수정

### 2.2 서버

- `POST /api/locations/geocode` 추가
- `POST /api/locations/reverse-geocode` 추가
- `POST /api/routes/address-round-trip` 추가
- 카카오 Local REST API를 서버 프록시로 호출
- 주소→좌표 변환 후 ORS Round Trip 경로 생성
- ORS 실패 시 가까운 DB 코스 후보 선택
- 가까운 DB 코스 좌표로 ORS 경로 생성 재시도
- 재시도 실패 시 가까운 DB 코스 자체를 fallback 반환
- 주소 기반 경로 생성 API에서 `latitude`, `longitude`가 `null`로 들어와도 optional 처리하도록 방어

### 2.3 환경변수

`.env.example`, `server/.env.example`, `docker-compose.yml`에 `KAKAO_REST_API_KEY`를 추가했다.

실제 `.env`와 GitHub Secret 값은 사용자가 직접 관리한다.

---

## 3. API 흐름

```text
주소 입력
→ POST /api/routes/address-round-trip
→ 좌표가 없으면 카카오 주소→좌표 변환
→ ORS Round Trip 경로 생성
→ 실패 시 가까운 DB 코스 후보 선택
→ 후보 좌표로 ORS 재시도
→ 재시도 실패 시 DB 코스 반환
```

GPS 보조 흐름:

```text
현재 위치 클릭
→ 브라우저 Geolocation 좌표 취득
→ POST /api/locations/reverse-geocode
→ 성공 시 주소 입력칸 채움
→ 실패 시 "현재 위치 기준"으로 좌표만 사용
```

---

## 4. 변경 파일 요약

| 구분               | 파일                                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 클라이언트         | `client/src/pages/HomePage.jsx`, `client/src/pages/ResultPage.jsx`                                                                                                             |
| 클라이언트 API     | `client/src/api/routes.js`, `client/src/api/locations.js`                                                                                                                      |
| 클라이언트 상태/UI | `client/src/context/CourseProvider.jsx`, `client/src/constants/recommendationModes.js`, `client/src/components/CourseCard.jsx`, `client/src/index.css`                         |
| 서버 API           | `server/src/routes/locations.js`, `server/src/controllers/locationsController.js`, `server/src/services/geocodingService.js`                                                   |
| 서버 경로          | `server/src/routes/routes.js`, `server/src/controllers/routesController.js`, `server/src/services/coursesService.js`, `server/src/services/orsService.js`, `server/src/app.js` |
| 환경/배포          | `.env.example`, `server/.env.example`, `docker-compose.yml`, `.github/workflows/deploy.yml`                                                                                    |
| 문서               | `docs/01-overview.md`, `docs/03-requirements.md`, `docs/06-data-spec.md`, `docs/plans/plan-21-address-first-routes.md`, `docs/pr/pr-21-address-first-routes.md`                |

---

## 5. 검증 결과

| 검증 항목                                                    | 결과 |
| ------------------------------------------------------------ | ---- |
| `npm.cmd --prefix client run lint`                           | 통과 |
| `npm.cmd --prefix client run build`                          | 통과 |
| `node --check server/src/controllers/routesController.js`    | 통과 |
| `node --check server/src/routes/routes.js`                   | 통과 |
| `node --check server/src/services/geocodingService.js`       | 통과 |
| `node --check server/src/controllers/locationsController.js` | 통과 |
| `node --check server/src/routes/locations.js`                | 통과 |

빌드 중 `VITE_KAKAO_MAP_KEY` 미설정 경고가 표시되었지만 빌드는 성공했다.

### 5.1 추가 확인: 직접 주소 입력 검증 오류

주소를 직접 입력한 경우 클라이언트 상태에는 좌표가 아직 없기 때문에 `latitude`, `longitude`가 `null`이다. 기존 요청은 이 `null` 값을 그대로 서버에 보냈고, 서버의 좌표 검증이 주소 변환보다 먼저 실행되어 `latitude는 -90~90 사이의 숫자여야 합니다.` 오류가 발생했다.

수정 후에는 클라이언트가 `null` 좌표를 요청 body에서 제외하고, 서버도 `null` 좌표를 optional로 처리한다. 따라서 직접 주소 입력 요청은 주소만 전달한 뒤 서버에서 카카오 주소→좌표 변환을 수행한다.

---

## 6. 후속 확인

1. 루트 `.env` 또는 배포 `ENV_FILE`에 `KAKAO_REST_API_KEY` 추가
2. `ORS_API_KEY` 유지 확인
3. 실제 실행 환경에서 주소 입력 → 좌표 변환 → 경로 생성 확인
4. ORS 실패 상황에서 가까운 DB fallback 결과 확인
5. 상세 주소 검색 실패 케이스는 Step 22에서 주소 검색 결과 선택 UI로 개선 검토
