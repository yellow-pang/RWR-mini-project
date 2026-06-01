# 작업계획서 - Step 23: 우편번호 서비스 기반 주소 선택 UX 개선

> **상태**: 승인 대기  
> **작성일**: 2026.06.01  
> **브랜치**: `feat/step-23-postcode-address-selection`  
> **목적**: 카카오 Local 주소 검색 API의 부분 도로명 검색 한계를 보완하기 위해, Kakao 우편번호 서비스로 정확한 주소를 먼저 선택하고 선택된 주소를 좌표로 변환하는 흐름으로 개선  
> **관련 문서**: [step-22-address-search-ui.md](../steps/step-22-address-search-ui.md) | [pr-22-address-search-ui.md](../pr/pr-22-address-search-ui.md)

---

## 1. 작업 배경

Step 22에서는 홈 화면에 주소 검색 결과 선택 UI를 추가했다. 사용자는 검색어를 입력하고, 서버가 카카오 Local REST API `/v2/local/search/address.json` 결과를 후보 목록으로 반환하면 그중 하나를 선택해 추천 기준 위치를 확정한다.

하지만 실제 확인 결과 `사당로 14다길`처럼 도로명 일부를 입력했을 때 기대한 `2-2`, `2-4`, `2-6` 같은 하위 건물번호 후보가 충분히 노출되지 않을 수 있다. 이는 현재 구현만의 문제가 아니라, 카카오 Local 주소 검색 API가 본질적으로 주소 후보 자동완성 서비스라기보다 주소를 좌표로 변환하기 위한 API에 가깝기 때문이다.

반면 Kakao 우편번호 서비스는 웹사이트에서 우편번호 검색과 도로명 주소 입력 기능을 제공하기 위한 서비스이며, 도로명, 건물명, 지번 검색에 더 적합하다. 공식 가이드에서도 팝업 방식과 iframe 레이어 방식, 페이지 삽입 방식을 제공한다.

따라서 Step 23에서는 주소 후보 검색을 Kakao 우편번호 서비스로 맡기고, 기존 카카오 Local REST API는 선택된 주소를 좌표로 변환하는 용도로만 사용하도록 역할을 분리한다.

---

## 2. 최종 목표

홈 화면 출발 주소 영역을 다음 흐름으로 개선한다.

```text
[주소 찾기 버튼]
[선택된 주소 표시 영역]
```

사용자가 `주소 찾기` 버튼을 누르면 페이지 안에 Kakao 우편번호 서비스 iframe 레이어가 열린다. 사용자는 해당 레이어에서 도로명, 지번, 건물명 등을 검색하고 정확한 주소를 선택한다.

주소를 선택하면 클라이언트는 선택된 주소를 서버의 `POST /api/locations/geocode`로 전달해 좌표를 변환한다. 좌표 변환에 성공한 경우에만 `routeLocation`에 주소와 좌표를 저장하고 `코스 생성` 버튼을 활성화한다.

코스 생성은 우편번호 서비스에서 선택하고 좌표 변환까지 성공한 주소 또는 GPS 현재 위치 좌표 기준으로만 진행한다.

---

## 3. 결정 사항

| 항목                      | 결정                          | 이유                                                                          |
| ------------------------- | ----------------------------- | ----------------------------------------------------------------------------- |
| 우편번호 서비스 표시 방식 | iframe 레이어 / embed 방식    | 모바일 웹에서 팝업보다 흐름이 덜 끊기고 WebView 계열 팝업 이슈를 줄일 수 있음 |
| Step 22 검색 목록 UI      | 우편번호 서비스로 대체        | 주소 검색 UX가 두 개 있으면 사용자가 헷갈릴 수 있음                           |
| 좌표 변환 시점            | 주소 선택 직후 즉시 변환      | 선택 주소가 실제 코스 생성 가능한지 바로 알 수 있음                           |
| 상세주소 입력             | 이번 Step에서는 추가하지 않음 | RWR은 배송지가 아니라 출발 기준 좌표가 필요하므로 기본 주소만 사용            |
| GPS 현재 위치 버튼        | 유지                          | 현재 위치 기준 코스 생성 보조 기능은 여전히 유용함                            |
| DB/환경/Docker 변경       | 없음                          | 외부 우편번호 스크립트와 기존 서버 geocode API만 사용                         |

---

## 4. 요구사항 요약

- 홈 화면의 Step 22 주소 검색어 입력칸과 검색 결과 목록을 우편번호 서비스 기반 주소 선택 UI로 대체한다.
- `주소 찾기` 버튼을 제공한다.
- 버튼 클릭 시 Kakao 우편번호 서비스 iframe 레이어를 홈 화면 안에 표시한다.
- 사용자가 우편번호 서비스에서 주소를 선택하면 선택 주소를 서버 `POST /api/locations/geocode`로 좌표 변환한다.
- 좌표 변환 성공 시 선택 주소/좌표를 `routeLocation`에 저장한다.
- 좌표 변환 실패 시 선택 주소를 코스 생성 기준으로 확정하지 않고 안내 메시지를 표시한다.
- `코스 생성` 버튼은 선택 주소/좌표 또는 GPS 좌표가 있을 때만 활성화한다.
- GPS `현재 위치 사용` 버튼은 유지한다.
- 컴포넌트에서 직접 `fetch`를 호출하지 않고 `client/src/api/` 모듈을 경유한다.
- 함수형 컴포넌트와 Hooks만 사용한다.
- 로그인, AI 추천, 공유, 주소 저장 등 MVP 외 기능은 추가하지 않는다.

---

## 5. UX 설계

### 5.1 기본 배치

```text
출발 주소

[주소 찾기]

선택된 주소
검색 결과에서 출발 주소를 선택해 주세요.

[현재 위치 사용]
```

주소 찾기 버튼을 누르면 주소 카드 안에 우편번호 서비스 레이어가 overlay로 열린다. 이 레이어는 아래 조건 섹션을 밀어내지 않는다.

```text
출발 주소

[주소 찾기] [닫기]

┌──────────────────────────────┐
│ Kakao 우편번호 검색 iframe    │
│ 도로명, 지번, 건물명 검색      │
└──────────────────────────────┘

선택된 주소
서울특별시 동작구 사당로14다길 2-2
```

### 5.2 상태별 UI

| 상태                      | 표시                                              |
| ------------------------- | ------------------------------------------------- |
| 초기                      | 주소 찾기 버튼, 선택 주소 빈 상태                 |
| 우편번호 스크립트 로딩 중 | 주소 찾기 버튼 비활성 또는 로딩 안내              |
| 우편번호 레이어 열림      | iframe 주소 검색 영역과 닫기 버튼 표시            |
| 주소 선택됨               | 선택 주소 표시 영역에 주소 표시, 좌표 변환 진행   |
| 좌표 변환 중              | `주소 좌표 확인 중...` 안내                       |
| 좌표 변환 성공            | 선택 주소와 좌표 저장, 코스 생성 가능             |
| 좌표 변환 실패            | 좌표 변환 실패 안내, 코스 생성 비활성             |
| GPS 사용 성공             | 선택 주소 영역에 현재 위치 주소 표시              |
| GPS 주소 변환 실패        | 선택 주소 영역에 `현재 위치 기준` 표시, 좌표 저장 |

### 5.3 모바일 UX 기준

- 우편번호 레이어는 모바일 폭에서 화면 밖으로 넘치지 않도록 `width: 100%` 기준으로 배치한다.
- 레이어 높이는 고정값보다 viewport 기반 최대 높이를 사용한다.
- 레이어는 absolute overlay로 표시해 선택 주소 영역과 아래 조건 섹션을 밀어내지 않는다.
- 닫기 버튼은 터치 타겟 44px 이상을 유지한다.

---

## 6. 기술 설계

### 6.1 우편번호 스크립트 로딩

사용 스크립트:

```html
https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js
```

계획:

- 클라이언트에서 필요한 시점에 스크립트를 동적으로 로드한다.
- 중복 로드를 막기 위해 `window.kakao?.Postcode` 존재 여부를 먼저 확인한다.
- 스크립트 로드 실패 시 안내 메시지를 표시한다.
- 스크립트 로딩 로직은 HomePage 내부에 길게 두지 않고 별도 유틸 또는 훅으로 분리하는 것을 우선 검토한다.

후보 파일:

- `client/src/utils/postcode.js`

### 6.2 iframe embed 방식

Kakao 우편번호 서비스는 다음 형태로 사용할 수 있다.

```js
new window.kakao.Postcode({
  oncomplete(data) {
    // 사용자가 주소 후보를 선택했을 때 실행
  },
  width: "100%",
  height: "100%",
}).embed(element);
```

계획:

- `useRef`로 iframe을 삽입할 DOM 영역을 참조한다.
- `isPostcodeOpen` 상태가 true일 때 레이어를 표시한다.
- 주소 선택 완료 시 레이어를 닫고 선택 주소를 좌표 변환한다.
- `onresize`를 사용할지 검토하되, CSS 높이 제어로 충분하면 단순화한다.

### 6.3 선택 주소 조합

우편번호 서비스의 `oncomplete(data)`에서 사용할 주요 값:

- `data.userSelectedType`
- `data.roadAddress`
- `data.jibunAddress`
- `data.address`
- `data.zonecode`
- `data.buildingName`
- `data.bname`
- `data.apartment`

선택 주소 기준:

- 도로명 선택이면 `roadAddress` 우선
- 지번 선택이면 `jibunAddress` 우선
- 둘 다 없으면 `address` 사용
- 좌표 변환에는 상세주소를 붙이지 않는다.

`routeLocation.address`에는 코스 기준으로 사용한 기본 주소를 저장한다. `zonecode`, `buildingName` 등은 이번 Step에서 전역 상태에 저장하지 않는다.

### 6.4 좌표 변환 API

Step 21에서 추가된 기존 API를 사용한다.

```text
POST /api/locations/geocode
```

요청:

```json
{
  "address": "서울특별시 동작구 사당로14다길 2-2"
}
```

응답:

```json
{
  "success": true,
  "data": {
    "address": "서울특별시 동작구 사당로14다길 2-2",
    "latitude": 37.0,
    "longitude": 126.0,
    "source": "kakao-address"
  }
}
```

클라이언트 API 모듈에는 `geocodeAddress({ address })` 함수를 추가한다.

---

## 7. 구현 계획

### 7.1 클라이언트 API 모듈

변경 대상:

- `client/src/api/locations.js`

계획:

- `geocodeAddress({ address })` 함수를 추가한다.
- 기존 `searchAddresses({ query })`는 Step 22 호환용으로 유지할지 제거할지 구현 시점에 판단한다.
  - 추천: 화면에서 사용하지 않게 만들고 서버 API는 유지한다.
  - 이유: 이미 문서화된 API를 즉시 제거하면 변경 범위가 커진다.

### 7.2 우편번호 유틸

변경 대상:

- `client/src/utils/postcode.js` 신규 검토

계획:

- `loadPostcodeScript()` 유틸을 만든다.
- 이미 로드된 경우 즉시 resolve한다.
- 로드 중복 호출을 방지한다.
- 로드 실패 시 reject한다.

### 7.3 HomePage 주소 영역

변경 대상:

- `client/src/pages/HomePage.jsx`
- `client/src/index.css`

계획:

- Step 22의 `addressQuery`, `addressResults`, `isSearchingAddress`, `addressSearchMessage` 중심 UI를 제거하거나 사용하지 않도록 정리한다.
- `isPostcodeOpen` state 추가
- `isPostcodeLoading` state 추가
- `isGeocodingAddress` state 추가
- `postcodeErrorMessage` 또는 기존 `errorMessage` 활용
- `postcodeLayerRef` 추가
- 주소 찾기 버튼 클릭 시 우편번호 스크립트 로드 후 iframe embed
- 주소 선택 시 선택 주소를 `geocodeAddress`로 좌표 변환
- 변환 성공 시 `routeLocation` 저장
- 변환 실패 시 `routeLocation` 초기화 및 안내 표시
- GPS 현재 위치 사용 버튼은 유지

### 7.4 ResultPage

변경 대상:

- `client/src/pages/ResultPage.jsx`

계획:

- 큰 변경은 없을 것으로 예상한다.
- 다시 추천이 `routeLocation.address`, `routeLocation.latitude`, `routeLocation.longitude` 기준으로 유지되는지 확인한다.

### 7.5 서버

변경 대상:

- 원칙적으로 없음

계획:

- 기존 `POST /api/locations/geocode`를 그대로 사용한다.
- `POST /api/locations/search`는 즉시 삭제하지 않는다.
- 서버 로직 변경이 필요해질 경우 별도 확인 후 진행한다.

---

## 8. 예상 변경 파일

| 구분           | 파일                                               | 내용                                                   |
| -------------- | -------------------------------------------------- | ------------------------------------------------------ |
| 수정           | `client/src/pages/HomePage.jsx`                    | 우편번호 서비스 레이어 주소 선택 흐름 구현             |
| 수정           | `client/src/api/locations.js`                      | 선택 주소 좌표 변환 API 함수 추가                      |
| 신규 또는 수정 | `client/src/utils/postcode.js`                     | 우편번호 스크립트 로딩 유틸                            |
| 수정           | `client/src/index.css`                             | 우편번호 레이어, 주소 찾기 버튼, 선택 주소 상태 스타일 |
| 수정           | `docs/01-overview.md`                              | 우편번호 서비스 기반 주소 선택 보정 기록 추가          |
| 수정           | `docs/03-requirements.md`                          | 주소 선택 UX 변경 요구사항 기록 추가                   |
| 수정           | `docs/06-data-spec.md`                             | 우편번호 서비스와 geocode API 역할 분리 기록 추가      |
| 신규           | `docs/pr/pr-23-postcode-address-selection.md`      | 구현 후 PR 문서                                        |
| 신규           | `docs/steps/step-23-postcode-address-selection.md` | 구현 후 Step 문서                                      |

---

## 9. 제외 범위

| 항목                           | 사유                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| 상세주소 입력/저장             | 출발 기준 좌표에는 기본 도로명/지번 주소로 충분하며 개인정보 저장 정책 검토가 필요함 |
| 사용자 주소 저장               | 개인정보성 데이터 저장 정책이 필요하므로 후속 검토                                   |
| 주소 즐겨찾기                  | MVP 범위를 벗어나며 데이터 모델 확장이 필요함                                        |
| 지도에서 위치 직접 선택        | 지도 인터랙션 범위가 커서 별도 단계로 분리                                           |
| 도로명주소 개발자센터 API 연동 | 이번 Step은 Kakao 우편번호 서비스로 UX 개선을 먼저 검증                              |
| DB 스키마 변경                 | 주소 선택 UX 개선에는 필요 없음                                                      |
| Docker/.env 변경               | 우편번호 서비스는 키가 필요 없고, 기존 geocode는 현재 `KAKAO_REST_API_KEY`를 사용    |
| 로그인, AI 추천, 공유          | MVP 외 기능이므로 추가하지 않음                                                      |

---

## 10. 검증 항목

| 항목                   | 확인 방법                                                               |
| ---------------------- | ----------------------------------------------------------------------- |
| 주소 찾기 버튼 표시    | 홈 화면 출발 주소 섹션에서 버튼 확인                                    |
| 우편번호 스크립트 로딩 | 주소 찾기 클릭 시 레이어가 정상 표시되는지 확인                         |
| 주소 검색/선택         | 우편번호 레이어에서 `사당로 14다길` 등으로 검색 후 주소 선택            |
| 좌표 변환 성공         | 주소 선택 후 `/api/locations/geocode` 호출 및 `routeLocation` 갱신 확인 |
| 좌표 변환 실패         | 실패 안내 표시 및 코스 생성 비활성 확인                                 |
| 코스 생성 버튼         | 선택 주소/좌표가 있을 때만 활성화                                       |
| GPS 보조 유지          | 현재 위치 사용 버튼 동작 유지                                           |
| 다시 추천              | 결과 화면에서 선택 주소/좌표 기준 재생성                                |
| 모바일 레이아웃        | 375px 폭에서 우편번호 레이어와 버튼이 겹치지 않는지 확인                |
| lint                   | `npm.cmd --prefix client run lint`                                      |
| build                  | `npm.cmd --prefix client run build`                                     |

---

## 11. 리스크와 대응

| 리스크                                 | 대응                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------ |
| 외부 우편번호 스크립트 로딩 실패       | 안내 메시지를 표시하고 다시 시도 가능하게 한다                                       |
| iframe 레이어가 모바일에서 너무 커짐   | viewport 기반 높이와 닫기 버튼을 제공한다                                            |
| 주소 선택 후 카카오 geocode 실패       | 주소는 표시하되 추천 기준 위치로 확정하지 않고 오류 안내                             |
| 우편번호 서비스 UI와 기존 홈 UI가 겹침 | 주소 섹션 내부에 공간을 차지하는 embed 방식으로 배치                                 |
| Step 22 검색 API가 남아 혼란           | 화면에서는 우편번호 서비스를 단일 주소 선택 UX로 사용하고 기존 API는 호환용으로 유지 |

---

## 12. 실제 개발 환경에서 이어가기 프롬프트

아래 프롬프트를 새 대화에 붙여 넣으면 Step 23 구현을 이어갈 수 있다.

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
4. 현재 작업 기준 문서: docs/plans/plan-23-postcode-address-selection.md
5. 이전 완료 상태: docs/steps/step-22-address-search-ui.md
6. 이전 PR 문서: docs/pr/pr-22-address-search-ui.md

작업 프로세스:
1. 요구사항과 최종 목표를 요약합니다.
2. git status로 미커밋 변경을 확인합니다.
3. 현재 브랜치가 feat/step-23-postcode-address-selection 인지 확인합니다.
4. 코드 수정 전 plan-23 문서를 기준으로 구현 범위를 재확인합니다.
5. 사용자 승인 후 코드 수정과 검증을 진행합니다.
6. PR/Step 문서를 작성합니다.
7. 한글 Conventional Commit 메시지 초안을 제목과 본문으로 출력합니다.

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
- Step 23: 우편번호 서비스 기반 주소 선택 UX 개선
- 홈 화면 주소 선택 UI를 Kakao 우편번호 서비스 iframe 레이어 방식으로 변경합니다.
- Step 22의 카카오 Local 검색 결과 목록 UI는 화면에서 대체합니다.
- 사용자가 우편번호 서비스에서 주소를 선택하면 /api/locations/geocode로 좌표를 즉시 변환합니다.
- 좌표 변환 성공 시에만 routeLocation에 주소/좌표를 저장하고 코스 생성을 활성화합니다.
- GPS 현재 위치 보조 버튼은 유지합니다.
- 구현 후 docs/pr/pr-23-postcode-address-selection.md, docs/steps/step-23-postcode-address-selection.md를 작성합니다.
```
