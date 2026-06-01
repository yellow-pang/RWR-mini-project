# PR 21. 주소 입력 중심 랜덤 경로 생성

> 작성일: 2026.06.01  
> 브랜치: `feat/step-21-address-first-routes`  
> 관련 계획서: [plan-21-address-first-routes.md](../plans/plan-21-address-first-routes.md)

---

## 1. 변경 목적

기존 `랜덤 코스` / `GPS 자동 추천` 선택 버튼을 제거하고, 사용자가 주소를 입력한 뒤 `코스 생성` 버튼 하나로 랜덤 경로를 생성하도록 홈 화면 흐름을 단순화한다.

GPS는 메인 추천 방식이 아니라 주소 입력을 돕는 `현재 위치 사용` 보조 기능으로 변경한다.

---

## 2. 주요 변경

| 구분       | 내용                                                        |
| ---------- | ----------------------------------------------------------- |
| 클라이언트 | 홈 화면에 주소 입력칸과 `현재 위치` 보조 버튼 추가          |
| 클라이언트 | 추천 방식 선택 UI 제거, `코스 생성` 단일 버튼으로 통합      |
| 클라이언트 | 결과 화면의 다시 추천을 주소/좌표 기준으로 재생성           |
| 클라이언트 | 주소 직접 입력 시 `null` 좌표를 요청 body에서 제외          |
| 서버       | 카카오 Local REST API 기반 주소→좌표, 좌표→주소 프록시 추가 |
| 서버       | `POST /api/routes/address-round-trip` 추가                  |
| 서버       | 주소 기반 API의 `null` 좌표 optional 처리                   |
| 서버       | ORS 실패 시 가까운 DB 코스 좌표로 fallback 경로 생성 재시도 |
| 서버       | fallback 경로 재생성도 실패하면 가까운 DB 코스 반환         |
| 환경변수   | `KAKAO_REST_API_KEY` 예제 및 Docker 전달 구조 추가          |
| 문서       | 주소 입력 중심 변경 기록 추가                               |

---

## 3. 변경 파일

| 파일                                            | 설명                                                     |
| ----------------------------------------------- | -------------------------------------------------------- |
| `client/src/pages/HomePage.jsx`                 | 주소 입력 중심 홈 화면 구현                              |
| `client/src/pages/ResultPage.jsx`               | 주소/좌표 기준 다시 추천                                 |
| `client/src/api/routes.js`                      | 주소 기반 경로 생성 API 함수 추가, null 좌표 제외        |
| `client/src/api/locations.js`                   | GPS 좌표→주소 변환 API 함수 추가                         |
| `client/src/context/CourseProvider.jsx`         | 추천 기준 위치 상태 추가                                 |
| `client/src/constants/recommendationModes.js`   | 주소/GPS 보조 안내 문구 정리                             |
| `client/src/components/CourseCard.jsx`          | 생성형 코스 배지 문구 변경                               |
| `client/src/index.css`                          | 주소 입력 UI 스타일 추가                                 |
| `server/src/routes/locations.js`                | 위치 변환 라우트 추가                                    |
| `server/src/controllers/locationsController.js` | 위치 변환 컨트롤러 추가                                  |
| `server/src/services/geocodingService.js`       | 카카오 Local API 호출 서비스 추가                        |
| `server/src/routes/routes.js`                   | 주소 기반 경로 생성 라우트 추가, null 좌표 optional 처리 |
| `server/src/controllers/routesController.js`    | 주소/좌표 resolve, ORS, fallback 처리                    |
| `server/src/services/coursesService.js`         | 가까운 코스 후보 랜덤 선택 추가                          |
| `server/src/services/orsService.js`             | 생성형 코스 문구를 주소 기준으로 일반화                  |
| `.env.example`, `server/.env.example`           | `KAKAO_REST_API_KEY` 추가                                |
| `docker-compose.yml`                            | server 환경변수 전달 추가                                |
| `.github/workflows/deploy.yml`                  | ENV_FILE 안내 주석 갱신                                  |
| `docs/01-overview.md`                           | 주소 입력 중심 변경 기록 추가                            |
| `docs/03-requirements.md`                       | 주소 메인/GPS 보조 요구사항 기록 추가                    |
| `docs/06-data-spec.md`                          | 위치/경로 API와 좌표 fallback 명세 추가                  |

---

## 4. 검증

| 항목             | 결과                                                      |
| ---------------- | --------------------------------------------------------- |
| 클라이언트 lint  | `npm.cmd --prefix client run lint` 통과                   |
| 클라이언트 build | `npm.cmd --prefix client run build` 통과                  |
| 서버 문법 검사   | 신규/수정 서버 라우트·컨트롤러·서비스 `node --check` 통과 |

> 빌드 중 `VITE_KAKAO_MAP_KEY` 미설정 경고가 표시되었지만 빌드는 성공했다. 실제 주소 변환과 ORS 호출은 `KAKAO_REST_API_KEY`, `ORS_API_KEY`가 설정된 실행 환경에서 확인해야 한다.

### 4.1 직접 주소 입력 오류 수정

직접 주소 입력 시 클라이언트가 `latitude: null`, `longitude: null`을 함께 보내 서버 좌표 검증에서 `latitude는 -90~90 사이의 숫자여야 합니다.` 오류가 발생했다.

이를 방지하기 위해 클라이언트 요청에서 `null` 좌표를 제외하고, 서버 라우트 검증에서도 `null` 좌표를 optional로 처리했다. 이제 주소만 입력한 요청은 서버에서 카카오 주소→좌표 변환으로 이어진다.

상세 주소를 문자열 하나로 입력했을 때 카카오 주소 검색 결과가 없을 수 있는 케이스는 다음 단계에서 주소 검색 결과 선택 UI로 개선한다.

---

## 5. 배포/운영 주의

루트 `.env` 또는 GitHub Actions `ENV_FILE` Secret에 아래 값이 필요하다.

```env
KAKAO_REST_API_KEY=카카오_Developers_REST_API_KEY
ORS_API_KEY=account.heigit.org에서_확인한_basic_token
```

실제 `.env` 값은 커밋하지 않는다.
