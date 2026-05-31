# 작업계획서 - Step 19: ORS Round Trip 기반 GPS 경로 생성

> **상태**: 진행 중  
> **작성일**: 2026.05.31  
> **브랜치**: `feat/ors-round-trip-route`  
> **목적**: 현재 위치와 선택 조건을 바탕으로 ORS Round Trip API를 호출해 실제 도로망 기반 순환 경로를 생성하고 카카오맵에 표시  
> **관련 문서**: [plan-18-gps-location.md](./plan-18-gps-location.md) | [step-18-gps-location.md](../steps/step-18-gps-location.md)

---

## 1. 작업 배경

Step 18에서는 `GPS 자동 추천` 옵션과 Geolocation 위치 취득/fallback 구조를 추가했다.

다만 Step 18에는 실제 경로 생성 엔진이 없었기 때문에 위치 취득에 성공해도 기존 PostgreSQL 랜덤 추천으로 fallback했다. Step 19에서는 이 fallback 상태를 한 단계 진전시켜, 사용자의 현재 위치와 선택 조건을 바탕으로 실제 도로망 기반 순환 경로를 생성한다.

RWR의 최종 목표는 "현재 위치 + 목표 거리 + 소요 시간 + 운동 유형"을 이용해 매일 다른 걷기/조깅/러닝 코스를 자동 추천하는 것이다. ORS Round Trip API는 이 목표에 가장 가까운 외부 라우팅 엔진이다.

---

## 2. 목표

`GPS 자동 추천` 선택 시 기존 DB 코스 fallback 대신 ORS Round Trip API로 순환 경로를 생성한다.

생성된 경로는 카카오맵 위에 polyline으로 표시하고, ORS 호출 실패, 위치 권한 실패, API 키 미설정 등 예외 상황에서는 기존 DB 랜덤 추천으로 fallback한다.

---

## 3. 요구사항 요약

- `GPS 자동 추천` 선택 시 Geolocation API로 현재 위치를 취득한다.
- 현재 위치와 사용자가 선택한 거리 조건을 ORS Round Trip API 요청에 사용한다.
- 운동 유형별 ORS profile을 결정한다.
- ORS 응답의 경로 좌표를 카카오맵 polyline으로 표시한다.
- ORS 실패 시 기존 DB 랜덤 추천 fallback을 유지한다.
- 위치 권한 거부 시 기존 DB 랜덤 추천 fallback을 유지한다.
- ORS API key는 코드에 하드코딩하지 않는다.
- API key 발급 및 환경변수 설정 방법을 문서화한다.
- `npm.cmd run lint`, `npm.cmd run build`를 실행한다.

---

## 4. ORS API 사용 계획

### 4.1 사용할 API

| 항목       | 값                                                                      |
| ---------- | ----------------------------------------------------------------------- |
| 서비스     | openrouteservice Directions API                                         |
| 엔드포인트 | `POST https://api.openrouteservice.org/v2/directions/{profile}/geojson` |
| 목적       | 현재 위치 기준 round trip 경로 생성                                     |
| 인증       | ORS API key                                                             |
| 응답 형식  | GeoJSON                                                                 |

### 4.2 Round Trip 옵션

ORS Directions API는 request body의 `options.round_trip`으로 순환 경로 생성을 지원한다.

| 파라미터 | 타입    | 사용 계획                                     |
| -------- | ------- | --------------------------------------------- |
| `length` | Number  | 목표 거리(m). 예: 1km → 1000                  |
| `points` | Integer | 경로 생성용 중간 포인트 수. 기본 3 또는 4     |
| `seed`   | Integer | 랜덤 방향 생성을 위한 seed. 다시 추천 시 변경 |

> ORS 문서에 따르면 `length`는 목표 길이이며 실제 결과는 다를 수 있다. `points` 값이 커질수록 더 원형에 가까운 경로를 만들 수 있다.

### 4.3 요청 예시

```json
{
  "coordinates": [[127.0276, 37.4979]],
  "options": {
    "round_trip": {
      "length": 3000,
      "points": 4,
      "seed": 42
    }
  }
}
```

> ORS 좌표 순서는 `[longitude, latitude]`이다. Geolocation API의 `{ latitude, longitude }` 순서와 반대이므로 변환이 필요하다.

### 4.4 운동 유형별 profile 초안

| RWR 유형  | ORS profile    | 설명                         |
| --------- | -------------- | ---------------------------- |
| `walk`    | `foot-walking` | 산책/걷기                    |
| `jogging` | `foot-walking` | 보행자 도로 기반 조깅        |
| `running` | `foot-walking` | 러닝도 우선 보행자 경로 사용 |

> ORS에는 걷기 계열 profile로 `foot-walking`, `foot-hiking`이 있다. 도심 산책/러닝 서비스인 RWR은 우선 `foot-walking`을 사용한다. 추후 숲길/등산 성격의 코스가 생기면 `foot-hiking` 옵션을 검토한다.

---

## 5. API 키 발급 방법

### 5.1 발급 절차

1. HeiGIT/openrouteservice 토큰 관리 페이지 접속  
   https://account.heigit.org/manage/key

2. 회원가입 또는 로그인  
   현재 ORS는 HeiGIT 계정 기반으로 API token을 관리한다.

3. 기본 token 확인  
   최신 토큰 관리 페이지에서는 가입과 동시에 `basic` 이름의 기본 API Key(Token)가 자동 생성되어 제공된다.

4. token 복사  
   `basic` token 값을 복사해 서버 환경변수로 저장한다.

5. 필요 시 추가 token 생성/관리  
   토큰 관리 페이지에서 새 token을 추가하거나 기존 token을 관리한다.

### 5.2 구현 방식 결정

| 방식                                      | 장점                                                          | 단점                                             | 판단          |
| ----------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------ | ------------- |
| 클라이언트 직접 호출 (`VITE_ORS_API_KEY`) | 구현이 빠름, 서버 수정 적음                                   | API key가 브라우저에 노출되고 배포 관리가 어려움 | 사용하지 않음 |
| Express 서버 프록시 (`ORS_API_KEY`)       | API key 비노출, CORS/쿼터 제어 쉬움, 현재 배포 구조와 잘 맞음 | 서버 라우트 추가 필요                            | 확정          |

Step 19는 이미 배포까지 고려하는 단계이므로 **Express 서버 프록시 방식으로 확정**한다. 클라이언트 직접 호출은 로컬 검증은 빠르지만 Vite 빌드 결과에 키가 포함되어 운영 배포에 적합하지 않다.

### 5.3 서버 환경변수

루트 또는 서버 실행 환경에 아래 값을 추가한다.

```env
ORS_API_KEY=account.heigit.org에서_확인한_basic_token
```

> `.env`, Docker, GitHub Actions secret 변경은 사용자 확인 후 진행한다. 코드에는 `process.env.ORS_API_KEY`를 읽는 구조만 추가한다.

---

## 6. 서버 프록시 방식 설계안

### 6.1 신규 API

```text
POST /api/routes/round-trip
```

### 6.2 Request Body

```json
{
  "latitude": 37.4979,
  "longitude": 127.0276,
  "distance": 3,
  "time": 30,
  "type": "jogging",
  "seed": 42
}
```

### 6.3 Response Body

```json
{
  "success": true,
  "data": {
    "id": "generated-ors-...",
    "title": "GPS 자동 추천 코스",
    "distance": 3,
    "time": 30,
    "type": "jogging",
    "source": "ors",
    "geometry": {
      "type": "LineString",
      "coordinates": [
        [127.0276, 37.4979],
        [127.0281, 37.4982]
      ]
    },
    "summary": {
      "distance": 3120,
      "duration": 1840
    }
  }
}
```

---

## 7. 예상 변경 파일

| 구분 | 파일                                         | 내용                                         |
| ---- | -------------------------------------------- | -------------------------------------------- |
| 신규 | `server/src/routes/routes.js`                | ORS round trip API 라우트 추가               |
| 신규 | `server/src/controllers/routesController.js` | 요청 검증 및 응답 처리                       |
| 신규 | `server/src/services/orsService.js`          | ORS Directions API 호출                      |
| 수정 | `server/src/app.js`                          | `/api/routes` 라우트 연결                    |
| 신규 | `client/src/api/routes.js`                   | round trip 경로 생성 API 함수                |
| 수정 | `client/src/pages/HomePage.jsx`              | GPS 자동 추천 시 ORS route 요청 연결         |
| 수정 | `client/src/pages/ResultPage.jsx`            | 생성형 경로 결과 표시 및 다시 추천 seed 변경 |
| 수정 | `client/src/components/MapView.jsx`          | polyline 표시 지원                           |
| 수정 | `client/src/components/CourseCard.jsx`       | 생성형 코스 표시 지원                        |
| 신규 | `docs/pr/pr-19-ors-round-trip-route.md`      | PR 문서 작성                                 |
| 신규 | `docs/steps/step-19-ors-round-trip-route.md` | Step 문서 작성                               |

---

## 8. 제외 범위

| 항목                  | 사유                                                    |
| --------------------- | ------------------------------------------------------- |
| 생성형 코스 DB 저장   | 즐겨찾기/이력 구조 확장이 필요하므로 후속 단계에서 결정 |
| 사용자 위치 영구 저장 | 개인정보 정책 검토 필요                                 |
| 날씨/AI 기반 추천     | Step 19 범위 밖                                         |
| 복수 경로 후보 비교   | 우선 단일 round trip 생성부터 구현                      |

---

## 9. 검증 항목

| 항목                   | 확인 방법                                  |
| ---------------------- | ------------------------------------------ |
| API key 미설정 처리    | GPS 추천 시 fallback 또는 명확한 안내 표시 |
| 위치 권한 거부 처리    | 기존 DB 랜덤 추천 fallback                 |
| ORS 경로 생성 성공     | GeoJSON LineString 응답 확인               |
| 카카오맵 polyline 표시 | 결과 화면 지도에 경로 선 렌더링            |
| 다시 추천 랜덤성       | seed 변경으로 다른 경로 생성               |
| 기존 랜덤 추천 유지    | 랜덤 코스 모드 정상 동작                   |
| lint 오류 없음         | `npm.cmd run lint`                         |
| build 성공             | `npm.cmd run build`                        |

---

## 10. 사용자 준비 사항

코드 구현 전 사용자가 준비할 항목:

1. ORS 계정 생성
2. 토큰 관리 페이지에서 자동 생성된 `basic` token 확인
3. `ORS_API_KEY`를 직접 `.env` 또는 배포 secret에 입력
4. 구현 완료 후 로컬/배포 환경에서 서버가 `ORS_API_KEY`를 읽을 수 있는지 확인

---

## 11. 참고 공식 문서

- openrouteservice API 안내: https://api.openrouteservice.org/
- ORS/HeiGIT 토큰 관리: https://account.heigit.org/manage/key
- ORS Directions routing options: https://giscience.github.io/openrouteservice/api-reference/endpoints/directions/routing-options
- ORS API restrictions: https://openrouteservice.org/restrictions/
