# 작업계획서 - Step 22: 주소 검색 결과 선택 UI 추가

> **상태**: 승인 대기  
> **작성일**: 2026.06.01  
> **브랜치**: `feat/step-22-address-search-ui`  
> **목적**: 사용자가 주소 문자열을 직접 완성해 입력하는 방식의 실패율을 줄이기 위해, 카카오 주소 검색 결과를 보여주고 선택한 주소/좌표를 기준으로 코스를 생성하도록 UI 개선  
> **관련 문서**: [step-21-address-first-routes.md](../steps/step-21-address-first-routes.md) | [pr-21-address-first-routes.md](../pr/pr-21-address-first-routes.md)

---

## 1. 작업 배경

Step 21에서 추천 흐름을 주소 입력 중심으로 바꾸고, 서버에서 카카오 Local REST API로 주소를 좌표로 변환하도록 구현했다.

하지만 한국 주소는 도로명 상세 주소, 지번 주소, 읍면리 주소, 건물명, 빌라 주소처럼 입력 방식이 다양하다. 사용자가 주소를 자유 텍스트로 한 번에 입력하면 카카오 주소 검색 결과가 없거나, 사용자가 의도한 주소와 다른 좌표가 선택될 수 있다.

예를 들어 `서울특별시 동작구 사당로 14다길 2-2`처럼 상세 주소를 그대로 입력했을 때 단건 변환 API가 결과를 찾지 못할 수 있다. 이런 경우 회원가입/배송지 입력 서비스처럼 사용자가 검색어를 입력하고 후보 주소 목록에서 하나를 선택하는 흐름이 필요하다.

---

## 2. 최종 목표

홈 화면의 출발 주소 입력 영역을 다음 구조로 개선한다.

```text
[주소 검색어 입력칸] [검색 버튼]
[선택된 주소 표시 영역            ]
```

주소 검색어 입력칸은 사용자가 간략한 주소, 도로명, 지번, 건물명 등을 검색하는 용도다. 검색 결과가 있으면 후보 목록을 표시하고, 사용자가 하나를 선택하면 선택된 주소와 좌표를 추천 기준 위치로 저장한다.

코스 생성은 직접 입력 문자열이 아니라 **선택된 주소/좌표**를 기준으로 수행한다.

---

## 3. 요구사항 요약

- 홈 화면 주소 영역을 검색어 입력칸과 선택 주소 표시 영역으로 분리한다.
- 주소 검색 버튼을 추가한다.
- 카카오 Local API 검색 결과를 목록으로 표시한다.
- 사용자는 검색 결과 중 하나를 선택할 수 있다.
- 선택된 결과의 주소와 좌표를 `routeLocation`에 저장한다.
- `코스 생성` 버튼은 선택된 주소/좌표가 있을 때 활성화한다.
- 검색어만 있고 선택된 주소가 없으면 코스 생성하지 않는다.
- GPS `현재 위치` 버튼은 유지한다.
- GPS 좌표→주소 변환 성공 시 선택 주소 표시 영역에 주소를 채운다.
- 컴포넌트에서 직접 `fetch`를 호출하지 않고 `client/src/api/` 모듈을 경유한다.
- 함수형 컴포넌트와 Hooks만 사용한다.
- 로그인, AI 추천, 공유 등 MVP 외 기능은 추가하지 않는다.

---

## 4. UI 설계

### 4.1 기본 배치

엑셀 표 기준으로 보면 주소 영역은 2행 2열 구조다.

| 행  | 1열                   | 2열                   |
| --- | --------------------- | --------------------- |
| 1행 | 주소 검색어 입력칸    | 검색 버튼             |
| 2행 | 선택된 주소 표시 영역 | 선택된 주소 표시 영역 |

2행은 두 열을 합친 넓은 영역처럼 보이게 한다.

### 4.2 예상 화면 구조

```text
출발 주소

[사당로 14다길 2-2          ] [검색]

선택된 주소
서울특별시 동작구 사당로 14다길 2-2

검색 결과
- 서울특별시 동작구 사당로 ...
- 서울특별시 동작구 ...
```

검색 결과는 주소 입력 섹션 안에서만 표시한다. 화면 전체를 덮는 모달은 이번 단계에서 만들지 않는다.

### 4.3 상태별 UI

| 상태               | 표시                                                                   |
| ------------------ | ---------------------------------------------------------------------- |
| 초기               | 검색어 입력칸, 검색 버튼, 선택 주소 빈 상태                            |
| 검색 중            | 검색 버튼 비활성 또는 `검색 중...` 표시                                |
| 결과 있음          | 후보 주소 목록 표시                                                    |
| 결과 없음          | "검색 결과가 없습니다. 도로명이나 건물명을 줄여서 입력해 주세요." 안내 |
| 주소 선택됨        | 선택된 주소 표시 영역에 주소 표시, 코스 생성 가능                      |
| GPS 사용 성공      | 선택된 주소 표시 영역에 현재 위치 주소 표시                            |
| GPS 주소 변환 실패 | 선택된 주소 표시 영역에 `현재 위치 기준` 표시, 좌표 저장               |

---

## 5. API 설계

### 5.1 신규 또는 변경 API

현재 Step 21에는 단건 주소 변환 API가 있다.

```text
POST /api/locations/geocode
```

Step 22에서는 후보 목록을 반환하는 API를 추가한다.

```text
POST /api/locations/search
```

요청:

```json
{
  "query": "사당로 14다길 2-2"
}
```

응답:

```json
{
  "success": true,
  "data": [
    {
      "id": "kakao-address-0",
      "address": "서울특별시 동작구 사당로 14다길 2-2",
      "roadAddress": "서울특별시 동작구 사당로14다길 2-2",
      "jibunAddress": "서울특별시 동작구 사당동 ...",
      "latitude": 37.0,
      "longitude": 126.0,
      "source": "kakao-address"
    }
  ]
}
```

### 5.2 기존 API와의 관계

- `POST /api/locations/geocode`는 기존 호환을 위해 유지한다.
- 홈 화면의 새 주소 검색 UI는 `POST /api/locations/search`를 사용한다.
- `POST /api/routes/address-round-trip`는 선택된 주소/좌표를 그대로 사용한다.

---

## 6. 서버 구현 계획

### 6.1 geocodingService 확장

변경 대상:

- `server/src/services/geocodingService.js`

계획:

- 카카오 `/v2/local/search/address.json` 응답의 `documents` 전체를 최대 5~10개까지 변환한다.
- 각 결과는 클라이언트가 바로 선택할 수 있도록 주소명, 도로명 주소, 지번 주소, 위도, 경도를 포함한다.
- 좌표 순서는 카카오 응답의 `x=longitude`, `y=latitude`를 명확히 변환한다.

### 6.2 locations 라우트/컨트롤러 확장

변경 대상:

- `server/src/routes/locations.js`
- `server/src/controllers/locationsController.js`

계획:

- `POST /api/locations/search` 라우트를 추가한다.
- `query`는 2자 이상 200자 이하로 검증한다.
- 결과가 없어도 404 대신 `success: true, data: []`로 반환한다.
  - 이유: 검색 결과 없음은 서버 오류가 아니라 UI 상태이기 때문이다.

---

## 7. 클라이언트 구현 계획

### 7.1 API 모듈

변경 대상:

- `client/src/api/locations.js`

계획:

- `searchAddresses({ query })` 함수를 추가한다.
- 컴포넌트에서는 직접 `fetch`를 호출하지 않는다.

### 7.2 CourseProvider 상태

변경 대상:

- `client/src/context/CourseProvider.jsx`

계획:

- 기존 `routeLocation`은 유지한다.
- 필요한 경우 주소 검색어는 HomePage 로컬 state로 둔다.
- 선택된 주소/좌표만 전역 `routeLocation`에 저장한다.

판단:

- 주소 검색어와 검색 결과 목록은 홈 화면 전용 임시 상태이므로 Context에 올리지 않는다.
- 결과 화면의 다시 추천에는 선택된 `routeLocation`만 필요하다.

### 7.3 HomePage 주소 영역

변경 대상:

- `client/src/pages/HomePage.jsx`
- `client/src/index.css`

계획:

- `addressQuery` state 추가
- `addressResults` state 추가
- `isSearchingAddress` state 추가
- `addressSearchMessage` state 추가
- 검색 버튼 클릭 시 `searchAddresses` 호출
- 결과 선택 시 `routeLocation`에 주소/좌표 저장
- 선택된 주소가 바뀌면 기존 추천 meta 초기화
- 검색어만 입력한 상태에서는 `코스 생성` 버튼 비활성

### 7.4 ResultPage

변경 대상:

- `client/src/pages/ResultPage.jsx`

계획:

- 큰 변경은 없을 것으로 예상한다.
- 선택된 `routeLocation` 기준 다시 추천 흐름이 유지되는지 확인한다.

---

## 8. UX 세부 기준

### 8.1 검색어 입력

- placeholder 예시: `도로명, 지번, 건물명 검색`
- Enter 키로 검색 가능하도록 한다.
- 검색어 앞뒤 공백은 제거한다.

### 8.2 검색 결과 카드

각 결과는 다음 정보를 표시한다.

- 도로명 주소 우선 표시
- 지번 주소가 있으면 보조 텍스트로 표시
- 건물명 또는 지역명이 있으면 너무 길지 않게 보조 표시

### 8.3 선택된 주소 표시 영역

선택 후에는 넓은 영역에 주소를 표시한다.

예:

```text
선택된 주소
서울특별시 동작구 사당로14다길 2-2
```

선택 주소가 없으면:

```text
검색 결과에서 출발 주소를 선택해 주세요.
```

---

## 9. 예상 변경 파일

| 구분 | 파일                                            | 내용                                      |
| ---- | ----------------------------------------------- | ----------------------------------------- |
| 수정 | `server/src/services/geocodingService.js`       | 카카오 주소 검색 결과 목록 변환 함수 추가 |
| 수정 | `server/src/controllers/locationsController.js` | 주소 검색 컨트롤러 추가                   |
| 수정 | `server/src/routes/locations.js`                | `POST /api/locations/search` 라우트 추가  |
| 수정 | `client/src/api/locations.js`                   | `searchAddresses` API 함수 추가           |
| 수정 | `client/src/pages/HomePage.jsx`                 | 주소 검색/결과 선택 UI 구현               |
| 수정 | `client/src/index.css`                          | 주소 검색 UI 스타일 추가                  |
| 수정 | `docs/01-overview.md`                           | 주소 입력 보조 방식 변경 기록 추가        |
| 수정 | `docs/03-requirements.md`                       | 주소 검색 결과 선택 요구사항 기록 추가    |
| 수정 | `docs/06-data-spec.md`                          | `/locations/search` API 명세 추가         |
| 신규 | `docs/pr/pr-22-address-search-ui.md`            | 구현 후 PR 문서                           |
| 신규 | `docs/steps/step-22-address-search-ui.md`       | 구현 후 Step 문서                         |

---

## 10. 제외 범위

| 항목                        | 사유                                                         |
| --------------------------- | ------------------------------------------------------------ |
| 전체 화면 주소 검색 모달    | 이번 단계는 홈 화면 내 검색 결과 선택 UI로 충분              |
| 카카오 우편번호 서비스 팝업 | 별도 스크립트/외부 UI 의존이 커서 후속 검토                  |
| 지도에서 직접 위치 선택     | 지도 인터랙션 범위가 커져 별도 단계로 분리                   |
| 주소 자동완성 실시간 호출   | 호출량/디바운스/UX 설계가 필요하므로 검색 버튼 방식으로 시작 |
| 사용자 주소 저장            | 개인정보 저장 정책 검토 필요                                 |
| DB 스키마 변경              | 주소 검색 UI에는 필요 없음                                   |

---

## 11. 검증 항목

| 항목              | 확인 방법                                                 |
| ----------------- | --------------------------------------------------------- |
| 주소 검색 UI 표시 | 홈 화면에서 검색어 입력칸, 검색 버튼, 선택 주소 영역 확인 |
| 검색 성공         | 간략 검색어 입력 후 후보 주소 목록 표시                   |
| 검색 결과 없음    | 결과 없음 안내 표시                                       |
| 주소 선택         | 후보 클릭 시 선택 주소 영역과 `routeLocation` 갱신        |
| 코스 생성 버튼    | 선택 주소/좌표가 있을 때만 활성화                         |
| GPS 보조 유지     | 현재 위치 버튼 동작 유지                                  |
| 다시 추천         | 결과 화면에서 선택 주소/좌표 기준 재생성                  |
| API 응답 형식     | `/api/locations/search`가 `{ success, data }` 형식 반환   |
| lint              | `npm.cmd --prefix client run lint`                        |
| build             | `npm.cmd --prefix client run build`                       |
| 서버 문법 검사    | `node --check`로 신규/수정 서버 파일 확인                 |

---

## 12. 실제 개발 환경에서 이어가기 프롬프트

아래 프롬프트를 새 대화에 붙여 넣으면 Step 22 구현을 이어갈 수 있다.

```text
당신은 RWR: Run Walk Random 프로젝트를 돕는 AI 개발 에이전트입니다.

프로젝트 기준:
- React + Vite 클라이언트
- Node.js + Express API 서버
- PostgreSQL Docker DB
- 데이터는 PostgreSQL 기준이며, 정적 routeData.js나 즐겨찾기/이력 localStorage 배열 기준이 아닙니다.
- 사용자 식별은 localStorage의 rwr_user_id 익명 UUID를 사용합니다.

작업 전에 아래 문서를 읽어주세요:
1. docs/01-overview.md
2. docs/03-requirements.md
3. docs/06-data-spec.md
4. 현재 작업 기준 문서: docs/plans/plan-22-address-search-ui.md
5. 이전 완료 상태: docs/steps/step-21-address-first-routes.md
6. 이전 PR 문서: docs/pr/pr-21-address-first-routes.md

작업 프로세스:
1. 요구사항과 최종 목표를 요약합니다.
2. git status로 미커밋 변경을 확인합니다.
3. 현재 브랜치가 feat/step-22-address-search-ui 인지 확인합니다.
4. 코드 수정 전 plan-22 문서를 기준으로 구현 범위를 재확인합니다.
5. 사용자 승인 후 코드 수정과 검증을 진행합니다.
6. PR/Step 문서를 작성합니다.
7. 한글 Conventional Commit 메시지 초안을 출력합니다.

핵심 제약:
- 함수형 컴포넌트 + Hooks만 사용합니다.
- 컴포넌트에서 직접 fetch를 호출하지 않고 client/src/api/ 모듈을 경유합니다.
- schema.sql, seed.sql, Docker 설정, .env 변경은 사용자 확인 후 진행합니다.
- GPS, 공유, 로그인, AI 추천 등 MVP 외 기능은 임의로 추가하지 않습니다.
- git commit/push는 사용자가 직접 진행합니다.
- 한글 문서는 UTF-8 인코딩을 유지합니다.
- 실제 개발 환경이므로 필요한 범위에서만 테스트하고, 과도한 시도는 하지 않습니다.
- cmd 기반 명령을 우선 사용합니다.

오늘 할 작업:
- Step 22: 주소 검색 결과 선택 UI 추가
- 홈 화면 주소 영역을 2행 2열 구조로 개선합니다.
- 1행은 주소 검색어 입력칸 + 검색 버튼입니다.
- 2행은 선택된 주소를 넓게 표시하는 영역입니다.
- 카카오 Local API 검색 결과 목록을 보여주고, 사용자가 후보를 선택하면 해당 주소/좌표를 routeLocation에 저장합니다.
- 코스 생성은 자유 입력 문자열이 아니라 선택된 주소/좌표 기준으로만 진행합니다.
- GPS 현재 위치 보조 버튼은 유지합니다.
- 구현 후 docs/pr/pr-22-address-search-ui.md, docs/steps/step-22-address-search-ui.md를 작성합니다.
```
