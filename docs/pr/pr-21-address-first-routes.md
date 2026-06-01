# PR #21. 주소 입력 중심 랜덤 경로 생성

> 관련 작업 계획서: [docs/plans/plan-21-address-first-routes.md](../plans/plan-21-address-first-routes.md)  
> 관련 Step 문서: [docs/steps/step-21-address-first-routes.md](../steps/step-21-address-first-routes.md)

---

## 브랜치 정보

| 항목        | 값                                  |
| ----------- | ----------------------------------- |
| 작업 브랜치 | `feat/step-21-address-first-routes` |
| 병합 대상   | `dev`                               |
| 상태        | 완료                                |

---

## PR 제목

```text
[Step 21] 주소 입력 중심 랜덤 경로 생성
```

---

## 개요

Step 18~19에서 추가된 `GPS 자동 추천` 중심 흐름을 주소 입력 중심 흐름으로 변경했다.

사용자는 홈 화면에서 출발 주소, 거리, 소요 시간, 운동 유형을 입력한 뒤 `코스 생성` 버튼 하나로 랜덤 경로 생성을 요청한다. GPS는 메인 추천 방식이 아니라 `현재 위치` 버튼을 통한 주소 입력 보조 기능으로만 사용한다.

서버는 카카오 Local REST API로 주소를 좌표로 변환하고, ORS Round Trip API로 실제 도로망 기반 순환 경로를 생성한다. ORS 경로 생성이 실패하면 입력 위치와 가까운 DB 코스 후보를 찾아 fallback한다.

---

## 변경 파일 목록

| 구분 | 파일                                            | 변경 내용                                                    |
| ---- | ----------------------------------------------- | ------------------------------------------------------------ |
| 수정 | `client/src/pages/HomePage.jsx`                 | 주소 입력칸, 현재 위치 보조 버튼, `코스 생성` 단일 흐름 구현 |
| 수정 | `client/src/pages/ResultPage.jsx`               | 주소/좌표 기준 다시 추천 흐름으로 변경                       |
| 수정 | `client/src/api/routes.js`                      | 주소 기반 경로 생성 API 함수 추가, null 좌표 제외            |
| 신규 | `client/src/api/locations.js`                   | GPS 좌표→주소 변환 API 함수 추가                             |
| 수정 | `client/src/context/CourseProvider.jsx`         | 추천 기준 위치 상태 추가                                     |
| 수정 | `client/src/constants/recommendationModes.js`   | 주소/GPS 보조 안내 문구로 정리                               |
| 수정 | `client/src/components/CourseCard.jsx`          | 생성형 코스 배지를 `주소 생성`으로 변경                      |
| 수정 | `client/src/index.css`                          | 주소 입력 UI 스타일 추가                                     |
| 신규 | `server/src/routes/locations.js`                | 위치 변환 라우트 추가                                        |
| 신규 | `server/src/controllers/locationsController.js` | 위치 변환 컨트롤러 추가                                      |
| 신규 | `server/src/services/geocodingService.js`       | 카카오 Local API 호출 서비스 추가                            |
| 수정 | `server/src/routes/routes.js`                   | 주소 기반 경로 생성 라우트 추가, null 좌표 optional 처리     |
| 수정 | `server/src/controllers/routesController.js`    | 주소/좌표 resolve, ORS 생성, fallback 처리                   |
| 수정 | `server/src/services/coursesService.js`         | 가까운 코스 후보 랜덤 선택 로직 추가                         |
| 수정 | `server/src/services/orsService.js`             | 생성형 코스 문구를 주소 기준으로 일반화                      |
| 수정 | `server/src/app.js`                             | `/api/locations` 라우터 등록                                 |
| 수정 | `.env.example`                                  | `KAKAO_REST_API_KEY` 추가                                    |
| 수정 | `server/.env.example`                           | `KAKAO_REST_API_KEY` 추가                                    |
| 수정 | `docker-compose.yml`                            | server 환경변수에 `KAKAO_REST_API_KEY` 전달 추가             |
| 수정 | `.github/workflows/deploy.yml`                  | `ENV_FILE`에 카카오 REST 키 포함 필요 주석 추가              |
| 수정 | `docs/01-overview.md`                           | 주소 입력 중심 기능 보정 기록 추가                           |
| 수정 | `docs/03-requirements.md`                       | 주소 메인/GPS 보조 요구사항 보정 기록 추가                   |
| 수정 | `docs/06-data-spec.md`                          | 위치/경로 API와 좌표 fallback 명세 추가                      |
| 신규 | `docs/plans/plan-21-address-first-routes.md`    | Step 21 작업 계획서 작성                                     |
| 신규 | `docs/pr/pr-21-address-first-routes.md`         | PR 문서 작성                                                 |
| 신규 | `docs/steps/step-21-address-first-routes.md`    | Step 완료 문서 작성                                          |

---

## 변경 이유

브라우저 위치 권한 요청을 추천의 메인 흐름으로 두면 사용자가 서비스 진입 직후 권한 팝업을 마주하게 된다. 또한 사용자가 현재 위치가 아닌 다른 출발지를 기준으로 코스를 만들고 싶은 경우에도 GPS 중심 흐름은 맞지 않는다.

따라서 추천 기준점 입력 방식을 주소 직접 입력으로 변경하고, GPS는 현재 위치를 주소 입력칸에 채우는 보조 기능으로 낮췄다.

또한 한국 주소는 도로명 상세 주소, 읍면리 주소, 건물명 등 입력 방식이 다양하므로, 직접 주소 입력 시 좌표가 아직 없는 상태를 정상 흐름으로 처리해야 한다. 이를 위해 주소만 있는 요청은 서버에서 카카오 주소→좌표 변환을 먼저 수행하도록 정리했다.

---

## 동작 설명

- 사용자는 홈 화면에서 출발 주소를 입력한다.
- `현재 위치` 버튼을 누르면 Geolocation API로 좌표를 얻고, 서버가 카카오 좌표→주소 변환을 시도한다.
- 사용자는 거리, 소요 시간, 운동 유형을 선택한다.
- `코스 생성` 버튼 클릭 시 클라이언트는 `/api/routes/address-round-trip`으로 주소/좌표와 조건을 전송한다.
- 좌표가 없으면 서버가 카카오 Local REST API로 주소를 좌표로 변환한다.
- 서버는 변환 좌표를 기준으로 ORS Round Trip API를 호출한다.
- ORS 경로 생성에 성공하면 생성형 코스를 반환한다.
- ORS 경로 생성에 실패하면 입력 위치와 가까운 DB 코스 후보를 찾고, 해당 코스 좌표로 ORS 경로 생성을 한 번 더 시도한다.
- 재시도도 실패하면 가까운 DB 코스 자체를 fallback 결과로 반환한다.

---

## API Key 정책

- 카카오 REST API key는 https://developers.kakao.com 에서 확인한다.
- ORS token은 https://account.heigit.org/manage/key 에서 확인한다.
- 서버 실행 환경에 아래 값을 설정한다.

```env
KAKAO_REST_API_KEY=카카오_Developers_REST_API_KEY
ORS_API_KEY=account.heigit.org에서_확인한_basic_token
```

- 클라이언트에는 카카오 REST API key와 ORS API key를 노출하지 않는다.
- 실제 `.env` 값은 커밋하지 않는다.

---

## 검증

```powershell
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
node --check server/src/controllers/routesController.js
node --check server/src/routes/routes.js
node --check server/src/services/geocodingService.js
node --check server/src/controllers/locationsController.js
node --check server/src/routes/locations.js
```

| 항목                     | 결과                                            |
| ------------------------ | ----------------------------------------------- |
| 클라이언트 Lint          | 성공                                            |
| 클라이언트 Build         | 성공                                            |
| 서버 신규/수정 파일 검사 | 성공                                            |
| 실제 카카오 주소 변환    | 부분 확인 필요 (`KAKAO_REST_API_KEY` 설정 필요) |
| 실제 ORS 경로 생성       | 부분 확인 필요 (`ORS_API_KEY` 설정 필요)        |

> 빌드 중 `VITE_KAKAO_MAP_KEY` 미설정 경고가 표시되었지만 빌드는 성공했다.

---

## 오류 수정 기록

직접 주소 입력 시 클라이언트가 `latitude: null`, `longitude: null`을 함께 보내 서버 좌표 검증에서 `latitude는 -90~90 사이의 숫자여야 합니다.` 오류가 발생했다.

이를 방지하기 위해 클라이언트 요청에서 null 좌표를 제외하고, 서버 라우트 검증에서도 null 좌표를 optional로 처리했다. 이제 주소만 입력한 요청은 서버에서 카카오 주소→좌표 변환으로 이어진다.

---

## 후속 작업

- 루트 `.env` 또는 GitHub Actions `ENV_FILE` Secret에 `KAKAO_REST_API_KEY` 추가
- 실제 실행 환경에서 주소 입력 → 좌표 변환 → ORS 경로 생성 확인
- DB 실행 환경에서 ORS 실패 시 가까운 코스 fallback 확인
- 상세 주소 문자열 검색 실패 케이스를 줄이기 위해 Step 22에서 주소 검색 결과 선택 UI 추가
