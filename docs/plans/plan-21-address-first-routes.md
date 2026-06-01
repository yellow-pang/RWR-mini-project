# 작업계획서 - Step 21: 주소 입력 중심 랜덤 경로 생성

> **상태**: 완료  
> **작성일**: 2026.06.01  
> **브랜치**: `feat/step-21-address-first-routes`  
> **목적**: GPS를 메인 추천 방식에서 보조 입력 수단으로 낮추고, 사용자가 입력한 주소를 기준으로 랜덤 운동 코스를 생성하도록 추천 흐름 변경  
> **관련 문서**: [step-20-ors-api-key-env-fix.md](../steps/step-20-ors-api-key-env-fix.md) | [plan-19-ors-round-trip-route.md](./plan-19-ors-round-trip-route.md)

---

## 1. 작업 배경

Step 18~19에서는 `GPS 자동 추천`을 선택 옵션으로 두고, 위치 권한을 받아 ORS Round Trip API로 순환 경로를 생성하는 흐름을 구현했다.

하지만 실제 서비스 사용 흐름에서는 브라우저 위치 권한 요청이 진입 장벽이 될 수 있고, 사용자가 반드시 현재 위치에서만 출발하려는 것도 아니다. 따라서 이번 Step 21에서는 주소 입력을 메인 기능으로 삼고, GPS는 사용자가 현재 위치를 쉽게 채우고 싶을 때만 쓰는 보조 기능으로 변경한다.

RWR의 핵심 가치는 여전히 "오늘 어디로 갈지 고민하지 않게 랜덤 코스를 제안하는 것"이다. 다만 기준점 입력 방식이 `GPS 권한 요청 우선`에서 `주소 직접 입력 우선`으로 바뀐다.

---

## 2. 최종 목표

사용자는 홈 화면에서 주소, 거리, 시간, 운동 유형을 입력/선택한 뒤 코스 생성을 요청한다.

클라이언트는 입력 주소를 서버로 보내 좌표로 변환하고, 해당 좌표를 기준으로 ORS Round Trip API를 호출해 랜덤 순환 경로를 생성한다. GPS는 주소 입력을 보조하는 선택 기능으로만 제공한다.

주소 좌표 변환 또는 ORS 경로 생성이 실패하면, 서버에 저장된 코스 중 입력 주소 좌표와 가장 가까운 후보를 기준으로 fallback 추천을 수행한다.

---

## 3. 요구사항 요약

- 홈 화면에 주소 입력칸을 추가한다.
- 주소 입력을 메인 추천 흐름으로 사용한다.
- GPS는 "현재 위치 사용" 보조 버튼으로 제공한다.
- 기존 `GPS 자동 추천` / `랜덤 코스` 추천 방식 선택 버튼은 제거한다.
- 메인 CTA는 `코스 생성` 단일 버튼으로 통합한다.
- 사용자가 입력한 주소를 좌표로 변환한다.
- GPS 좌표를 얻은 경우 카카오 좌표→주소 변환을 시도해 주소 입력칸을 보조한다.
- 변환된 좌표를 기준으로 ORS Round Trip 랜덤 경로를 생성한다.
- 주소/ORS 처리 실패 시 DB에 저장된 코스 중 가까운 코스를 찾아 fallback한다.
- fallback도 "랜덤" 특성을 유지하도록 가까운 후보군에서 무작위 선택 또는 선택된 기준 코스 주변 경로 생성을 시도한다.
- DB 기반 fallback을 위해 코스 시작 좌표를 PostgreSQL에 저장한다.
- 컴포넌트에서 직접 `fetch`를 호출하지 않고 `client/src/api/` 모듈을 경유한다.
- 함수형 컴포넌트와 Hooks만 사용한다.
- GPS, 공유, 로그인, AI 추천 등 MVP 외 기능을 임의 확장하지 않는다.

---

## 4. 기능 흐름 설계

### 4.1 기본 성공 흐름

```text
주소 입력
→ 거리/시간/유형 선택
→ 코스 생성
→ 서버에서 주소를 좌표로 변환
→ 변환 좌표로 ORS Round Trip 경로 생성
→ 결과 화면에 생성형 경로 표시
```

### 4.2 GPS 보조 흐름

```text
현재 위치 사용 버튼 클릭
→ 브라우저 Geolocation API로 현재 좌표 취득
→ 서버에서 카카오 좌표→주소 변환 시도
→ 성공하면 주소 입력칸에 변환 주소를 채움
→ 실패하면 주소 입력칸에는 "현재 위치 기준" 성격의 표시값을 채우고 좌표를 추천 기준점으로 저장
→ 코스 생성 시 해당 좌표로 ORS Round Trip 경로 생성
```

> GPS 좌표→주소 변환은 입력 보조 기능이다. 실패해도 좌표가 있으면 코스 생성은 가능해야 하며, 사용자는 언제든 주소를 직접 입력할 수 있어야 한다.

### 4.3 fallback 흐름

```text
주소 좌표 변환 또는 ORS 생성 실패
→ 주소 좌표가 있으면 DB 코스와 거리 계산
→ 가까운 코스 후보군 추출
→ 후보군 내에서 랜덤 추천
→ 가능한 경우 후보 코스 좌표를 기준으로 ORS 경로 재생성 시도
→ 그래도 실패하면 기존 DB 코스 카드 표시
```

---

## 5. 주소 좌표 변환 설계안

### 5.1 서버 API 추가

```text
POST /api/locations/geocode
```

요청:

```json
{
  "address": "서울 성동구 왕십리로 63"
}
```

응답:

```json
{
  "success": true,
  "data": {
    "address": "서울 성동구 왕십리로 63",
    "latitude": 37.5446,
    "longitude": 127.0374,
    "source": "geocode"
  }
}
```

### 5.2 지오코딩 제공자 후보

| 후보               | 장점                                                      | 단점                     | 판단       |
| ------------------ | --------------------------------------------------------- | ------------------------ | ---------- |
| 카카오 로컬 API    | 한국 주소 검색 품질이 좋고 추후 주소 자동완성과 연결 가능 | REST API 키 필요         | 1순위 후보 |
| ORS Geocode/Search | ORS API key를 이미 사용 중                                | 한국 주소 품질 확인 필요 | 대체 후보  |

이번 Step 21에서는 **카카오 로컬 REST API 기반 서버 프록시**로 확정한다.

- 주소→좌표: `GET /v2/local/search/address.json`
- 좌표→주소: `GET /v2/local/geo/coord2address.json`
- 인증: `Authorization: KakaoAK ${KAKAO_REST_API_KEY}`

API key는 브라우저에 노출하지 않고 Express 서버 환경변수로만 읽는다.

---

## 6. API 설계 변경

### 6.1 신규 API: 주소 기반 경로 생성

```text
POST /api/routes/address-round-trip
```

요청:

```json
{
  "address": "서울 성동구 왕십리로 63",
  "latitude": 37.5446,
  "longitude": 127.0374,
  "distance": 3,
  "time": 30,
  "type": "jogging",
  "seed": 42
}
```

처리 규칙:

- `latitude`, `longitude`가 있으면 주소 문자열보다 좌표를 우선 사용한다.
- 좌표가 없고 `address`가 있으면 서버에서 지오코딩을 수행한다.
- 좌표 확보 후 기존 ORS Round Trip 생성 로직을 재사용한다.
- ORS 실패 시 가까운 DB 코스 fallback을 수행한다.

### 6.2 기존 API 유지

```text
POST /api/routes/round-trip
```

기존 GPS 기반 API는 내부 재사용 가능성을 위해 유지한다. 다만 클라이언트 메인 흐름에서는 새 주소 중심 API를 사용한다.

---

## 7. DB 변경 계획

fallback에서 "입력 주소와 가장 가까운 저장 코스"를 고르려면 저장 코스의 기준 좌표가 필요하다.

### 7.1 courses 테이블 확장

`server/src/db/schema.sql`의 `courses` 테이블에 아래 컬럼 추가를 검토한다.

```sql
start_latitude  NUMERIC(10, 7),
start_longitude NUMERIC(10, 7)
```

초기 시드 코스는 모두 좌표를 가질 수 있도록 `NOT NULL` 적용도 가능하지만, 기존 배포 DB와의 호환성을 고려해 구현 시점에 다음 중 하나를 선택한다.

| 방식          | 장점                   | 단점                                   |
| ------------- | ---------------------- | -------------------------------------- |
| nullable 컬럼 | 기존 DB 영향이 작음    | 좌표 없는 코스 fallback 제외 처리 필요 |
| NOT NULL 컬럼 | 데이터 정합성이 명확함 | 기존 DB 마이그레이션 부담 증가         |

MVP에서는 기존 데이터와 배포 안정성을 고려해 **nullable 컬럼 + 좌표 있는 코스만 거리 계산**으로 시작한다.

### 7.2 seed.sql 확장

`server/src/db/seed.sql`의 각 코스에 시작 좌표를 추가한다.

좌표는 카카오맵/공식 지도 기준으로 실제 코스 시작점에 가까운 값을 사용하되, 이번 단계에서는 fallback 거리 계산이 목적이므로 대표 지점 좌표로 충분하다.

### 7.3 거리 계산

서버에서 Haversine 공식을 사용해 입력 좌표와 코스 시작 좌표 간 거리를 계산한다.

PostGIS는 이번 단계에서 도입하지 않는다. 현재 범위에서는 단순 거리 정렬로 충분하고, Docker/PostgreSQL 설정 변경 부담을 줄이기 위함이다.

---

## 8. UI 변경 계획

### 8.1 홈 화면

변경 대상: `client/src/pages/HomePage.jsx`

- 주소 입력칸 추가
- `현재 위치 사용` 보조 버튼 추가
- 기존 `GPS 자동 추천` / `랜덤 코스` 추천 방식 선택 버튼 제거
- `코스 생성` 단일 버튼 제공
- 거리/시간/운동 유형 선택은 유지
- 주소 또는 GPS 좌표가 없으면 코스 생성 버튼 비활성 또는 안내 표시
- GPS 권한 실패 시 주소 직접 입력 안내

### 8.2 결과 화면

변경 대상: `client/src/pages/ResultPage.jsx`

- 다시 추천 시 이전 주소/좌표 기준을 유지한다.
- seed를 변경해 주소 기준 랜덤 경로를 다시 생성한다.
- fallback 추천인 경우 안내 문구를 표시한다.
- 생성형 경로와 DB 코스 결과를 모두 처리한다.

### 8.3 지도/카드

변경 대상:

- `client/src/components/MapView.jsx`
- `client/src/components/CourseCard.jsx`
- `client/src/components/CourseInfo.jsx`

계획:

- 생성형 경로는 polyline 표시 유지
- DB fallback 코스는 기존 마커/코스 카드 표시 유지
- "GPS 생성" 배지는 "주소 기준 생성" 또는 "랜덤 생성"으로 변경

---

## 9. 예상 변경 파일

| 구분 | 파일                                            | 내용                                               |
| ---- | ----------------------------------------------- | -------------------------------------------------- |
| 신규 | `server/src/routes/locations.js`                | 주소 지오코딩 API 라우트                           |
| 신규 | `server/src/controllers/locationsController.js` | 주소 입력 검증 및 지오코딩 응답                    |
| 신규 | `server/src/services/geocodingService.js`       | 카카오 주소→좌표, 좌표→주소 호출                   |
| 수정 | `server/src/routes/routes.js`                   | 주소 기반 round trip API 추가                      |
| 수정 | `server/src/controllers/routesController.js`    | 주소/좌표 기반 경로 생성 및 fallback 처리          |
| 수정 | `server/src/services/orsService.js`             | 기준점 명칭을 GPS에서 location/address로 일반화    |
| 수정 | `server/src/services/coursesService.js`         | 가까운 코스 조회/거리 계산 로직 추가               |
| 수정 | `server/src/app.js`                             | `/api/locations` 라우트 연결                       |
| 수정 | `server/src/db/schema.sql`                      | courses 시작 좌표 컬럼 추가                        |
| 수정 | `server/src/db/seed.sql`                        | 시드 코스 시작 좌표 추가                           |
| 신규 | `client/src/api/locations.js`                   | 주소 지오코딩 API 함수                             |
| 수정 | `client/src/api/routes.js`                      | 주소 기반 경로 생성 API 함수                       |
| 수정 | `client/src/constants/recommendationModes.js`   | GPS/랜덤 모드 상수 제거 또는 주소 중심 문구로 축소 |
| 수정 | `client/src/pages/HomePage.jsx`                 | 주소 입력 중심 UI                                  |
| 수정 | `client/src/pages/ResultPage.jsx`               | 주소 기준 다시 추천                                |
| 수정 | `client/src/components/MapView.jsx`             | 주소 기준 생성형 경로 표시 문구 정리               |
| 수정 | `client/src/components/CourseCard.jsx`          | 배지/문구 정리                                     |
| 수정 | `client/src/index.css`                          | 주소 입력 UI 스타일                                |
| 신규 | `docs/pr/pr-21-address-first-routes.md`         | 구현 후 PR 문서                                    |
| 신규 | `docs/steps/step-21-address-first-routes.md`    | 구현 후 Step 문서                                  |

---

## 10. 환경변수 변경 계획

카카오 로컬 API를 사용할 경우 서버 환경변수가 필요하다.

```env
KAKAO_REST_API_KEY=카카오_Developers_REST_API_KEY
```

변경 후보:

- `.env.example`
- `server/.env.example`
- `docker-compose.yml`
- `.github/workflows/deploy.yml`의 `ENV_FILE` 안내 주석

> 실제 `.env`, `server/.env`, GitHub Secret 값은 사용자가 직접 수정한다. 코드 구현 시 예제/배포 전달 구조만 반영한다.

---

## 11. 문서 수정 계획

구현 완료 후 기존 내용을 삭제하지 않고 변경 기록을 추가한다.

| 문서                                         | 수정 방향                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------- |
| `docs/01-overview.md`                        | GPS 중심에서 주소 입력 중심으로 기능 방향이 보정되었음을 기록           |
| `docs/03-requirements.md`                    | FR-25~29 GPS 요구사항을 주소 메인/GPS 보조 구조로 보정 기록 추가        |
| `docs/06-data-spec.md`                       | courses 좌표 컬럼, 주소 지오코딩 API, 주소 기반 경로 생성 API 추가 기록 |
| `docs/steps/step-21-address-first-routes.md` | 구현 결과와 검증 내역 작성                                              |
| `docs/pr/pr-21-address-first-routes.md`      | PR 설명, 변경 파일, 검증 결과 작성                                      |

---

## 12. 제외 범위

| 항목                        | 사유                                                                                          |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| 카카오 주소 자동완성 UI     | 이번 단계는 직접 주소 입력칸과 카카오 주소→좌표 변환까지가 목표                               |
| 주소 검색 결과 목록/선택 UI | 추후 카카오 주소 API 입력 보조 단계에서 구현                                                  |
| GPS 입력 보조 모달          | 이번 단계는 홈 화면의 `현재 위치 사용` 버튼으로 시작하고, 후보 선택 모달은 후속 개선으로 분리 |
| 사용자 위치/주소 영구 저장  | 개인정보 정책 검토 필요                                                                       |
| 생성형 코스 DB 저장         | 즐겨찾기/이력 구조 확장이 필요하므로 별도 단계로 분리                                         |
| PostGIS 도입                | 단순 가까운 코스 fallback에는 Haversine 계산으로 충분                                         |
| 로그인/AI/공유 기능 추가    | MVP 외 확장 기능                                                                              |

---

## 13. 검증 항목

| 항목                  | 확인 방법                                                             |
| --------------------- | --------------------------------------------------------------------- |
| 주소 입력 UI          | 홈 화면에서 주소 입력칸과 현재 위치 사용 버튼 표시                    |
| 버튼 활성 조건        | 주소 또는 GPS 좌표 + 거리/시간/유형 선택 시 생성 가능                 |
| 주소 지오코딩 성공    | `POST /api/locations/geocode` 또는 주소 기반 경로 API가 좌표 반환     |
| 주소 기반 ORS 성공    | 입력 주소 기준 생성형 경로가 지도 polyline으로 표시                   |
| GPS 보조 성공         | 현재 위치 사용 후 주소 입력칸이 보조 표시되고 코스 생성 가능          |
| GPS 권한 거부         | 주소 직접 입력 안내가 표시되고 앱이 중단되지 않음                     |
| ORS 실패 fallback     | 가까운 DB 코스 후보에서 추천 결과 표시                                |
| DB 좌표 fallback      | 좌표가 있는 코스만 거리 계산에 사용                                   |
| 다시 추천             | 같은 주소/좌표 기준으로 seed가 바뀌어 다른 경로 시도                  |
| 기존 저장 기능        | DB fallback 코스의 즐겨찾기/이력 저장 기존 동작 유지                  |
| 생성형 코스 저장 제한 | 생성형 코스는 기존 즐겨찾기/이력 저장 대상에서 무리하게 저장하지 않음 |
| lint                  | `npm.cmd run lint`                                                    |
| build                 | `npm.cmd run build`                                                   |

---

## 14. 구현 결정 사항

구현 과정에서 아래 기준으로 확정했다.

1. 주소 변환은 카카오 Local REST API 서버 프록시 방식으로 구현한다.
2. 환경변수 예제와 Docker server 환경에 `KAKAO_REST_API_KEY`를 추가한다.
3. 기존 DB의 `courses.start_lat`, `courses.start_lng` 좌표를 fallback 거리 계산에 사용한다.
4. 기존 `GPS 자동 추천` / `랜덤 코스` 모드 UI를 제거하고 `코스 생성` 단일 흐름으로 바꾼다.
5. GPS는 `현재 위치` 보조 버튼으로만 제공하며, 좌표→주소 변환 성공 시 주소 입력칸을 채운다.
