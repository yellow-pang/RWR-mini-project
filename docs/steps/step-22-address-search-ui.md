# Step 22. 주소 검색 결과 선택 UI 추가

> 작성일: 2026.06.01  
> 브랜치: `feat/step-22-address-search-ui`  
> 작업 계획서: [docs/plans/plan-22-address-search-ui.md](../plans/plan-22-address-search-ui.md)  
> 관련 PR 문서: [docs/pr/pr-22-address-search-ui.md](../pr/pr-22-address-search-ui.md)

---

## 1. 작업 목표

Step 21에서는 사용자가 홈 화면에 출발 주소를 직접 입력하면 서버가 해당 문자열을 카카오 Local API로 좌표 변환한 뒤 ORS Round Trip 경로를 생성했다.

Step 22의 목표는 이 흐름에서 주소 확정 방식을 더 안전하게 만드는 것이다. 사용자가 입력한 문자열을 곧바로 추천 기준점으로 보지 않고, 카카오 주소 검색 후보 목록에서 하나를 선택해야 코스 생성 기준 위치가 확정되도록 변경했다.

---

## 2. 중요 변경 요약

### 2.1 자유 입력 주소에서 선택 주소/좌표 기준으로 변경

이전 흐름에서는 주소 입력칸 값이 `routeLocation.address`에 바로 저장되었다. 따라서 사용자가 검색 결과를 확인하지 않은 자유 입력 문자열만으로도 코스 생성 요청이 가능했다.

이번 변경 후에는 주소 검색어와 선택된 주소를 분리했다.

- `addressQuery`: 홈 화면에서만 쓰는 주소 검색어
- `addressResults`: 홈 화면에서만 표시하는 검색 후보 목록
- `routeLocation`: 사용자가 후보를 선택했거나 GPS 보조 기능으로 좌표가 확보된 추천 기준 위치

결과적으로 `routeLocation`에는 추천에 사용할 수 있는 주소/좌표만 저장된다.

### 2.2 홈 화면 주소 영역 2행 구조 적용

출발 주소 섹션을 아래 구조로 변경했다.

```text
[주소 검색어 입력칸] [검색 버튼]
[선택된 주소 표시 영역            ]
```

선택된 주소가 없으면 선택 주소 영역에 `검색 결과에서 출발 주소를 선택해 주세요.`를 표시한다. 선택 후에는 실제 코스 생성 기준이 되는 도로명 주소 또는 대표 주소를 표시한다.

### 2.3 주소 검색 결과 목록 추가

`검색` 버튼 또는 Enter 키를 누르면 `/api/locations/search`를 호출한다. 결과가 있으면 주소 입력 섹션 안에 후보 목록을 표시한다.

각 후보에는 다음 정보를 표시한다.

- 도로명 주소 우선 표시
- 지번 주소 보조 표시
- 건물명 또는 지역 정보 보조 표시

사용자가 후보를 클릭하면 해당 주소, 위도, 경도, source를 `routeLocation`에 저장하고 검색 결과 목록을 닫는다.

### 2.4 코스 생성 활성화 조건 강화

`코스 생성` 버튼 활성화 조건을 강화했다.

기존에는 주소 문자열이 있거나 좌표가 있으면 위치 조건을 충족한 것으로 봤다. 이제는 `routeLocation.latitude`와 `routeLocation.longitude`가 있어야 위치 조건을 충족한다.

따라서 아래 상태에서는 코스 생성이 비활성화된다.

- 검색어만 입력한 상태
- 검색 결과가 없는 상태
- 검색 결과는 있지만 아직 후보를 선택하지 않은 상태

아래 상태에서는 코스 생성이 가능하다.

- 검색 결과 후보를 선택해 주소/좌표가 저장된 상태
- `현재 위치 사용`으로 GPS 좌표가 저장된 상태

### 2.5 GPS 보조 기능 유지

GPS `현재 위치 사용` 버튼은 유지했다.

좌표→주소 변환에 성공하면 변환된 주소를 `routeLocation`과 검색어 입력칸에 반영한다. 좌표→주소 변환이 실패하면 `현재 위치 기준`이라는 표시 주소와 GPS 좌표를 `routeLocation`에 저장한다.

이 경우에도 좌표가 있기 때문에 코스 생성 기준점으로 사용할 수 있다.

---

## 3. 서버 변경 내용

### 3.1 `geocodingService` 주소 검색 목록 변환 추가

변경 파일: `server/src/services/geocodingService.js`

추가된 기능:

- 카카오 `/v2/local/search/address.json` 응답의 `documents` 목록을 최대 10개까지 변환
- 카카오 응답의 `x`를 longitude, `y`를 latitude로 명확히 변환
- 클라이언트 선택 UI에 필요한 주소 필드 구성

반환 필드:

- `id`
- `address`
- `roadAddress`
- `jibunAddress`
- `buildingName`
- `region`
- `latitude`
- `longitude`
- `source`

### 3.2 locations 컨트롤러/라우트 확장

변경 파일:

- `server/src/controllers/locationsController.js`
- `server/src/routes/locations.js`

추가된 API:

```text
POST /api/locations/search
```

요청 body:

```json
{ "query": "사당로 14다길 2-2" }
```

검증:

- `query`는 2자 이상 200자 이하

응답:

- 성공 시 `{ success: true, data: [...] }`
- 결과가 없어도 `404`가 아니라 빈 배열 반환
- 카카오 API key 누락 또는 외부 API 실패는 기존 에러 처리 흐름 사용

---

## 4. 클라이언트 변경 내용

### 4.1 API 모듈 추가

변경 파일: `client/src/api/locations.js`

추가 함수:

```js
searchAddresses({ query });
```

홈 화면 컴포넌트는 직접 `fetch`를 호출하지 않고 이 API 모듈을 통해 주소 검색을 요청한다.

### 4.2 HomePage 상태 변경

변경 파일: `client/src/pages/HomePage.jsx`

추가된 로컬 상태:

- `addressQuery`: 검색어 입력값
- `addressResults`: 검색 후보 목록
- `isSearchingAddress`: 주소 검색 진행 상태
- `addressSearchMessage`: 검색 결과 없음 또는 검색 실패 안내

전역 상태로 유지한 값:

- `routeLocation`: 선택된 주소/좌표 또는 GPS 좌표

이 구조 덕분에 검색어를 입력하는 중간 상태가 추천 기준 위치로 오인되지 않는다.

### 4.3 검색/선택 이벤트

추가된 동작:

- 검색어 변경 시 기존 선택 위치를 초기화
- 검색 버튼 클릭 시 주소 검색 API 호출
- Enter 키 입력 시 주소 검색 API 호출
- 결과 없음 안내 표시
- 후보 클릭 시 `routeLocation` 저장
- 후보 선택 후 검색 결과 목록 닫기

### 4.4 스타일 추가

변경 파일: `client/src/index.css`

추가된 UI 스타일:

- 주소 검색 2행 2열 그리드
- 검색 버튼
- 선택된 주소 표시 패널
- 주소 검색 결과 목록
- 주소 결과 카드
- 검색 안내/오류 메시지

---

## 5. 변경된 사용자 흐름

### 5.1 주소 검색으로 코스 생성

```text
주소 검색어 입력
→ 검색 버튼 또는 Enter
→ 카카오 주소 검색 후보 표시
→ 후보 주소 선택
→ 선택 주소/좌표가 routeLocation에 저장
→ 거리/시간/운동 유형 선택
→ 코스 생성
→ POST /api/routes/address-round-trip
```

### 5.2 GPS 보조로 코스 생성

```text
현재 위치 사용
→ 브라우저 Geolocation 좌표 취득
→ POST /api/locations/reverse-geocode
→ 성공 시 주소와 좌표 저장
→ 실패 시 현재 위치 기준 + 좌표 저장
→ 거리/시간/운동 유형 선택
→ 코스 생성
```

---

## 6. 변경 파일 요약

| 구분           | 파일                                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 클라이언트 UI  | `client/src/pages/HomePage.jsx`                                                                                                                           |
| 클라이언트 API | `client/src/api/locations.js`                                                                                                                             |
| 클라이언트 CSS | `client/src/index.css`                                                                                                                                    |
| 서버 서비스    | `server/src/services/geocodingService.js`                                                                                                                 |
| 서버 컨트롤러  | `server/src/controllers/locationsController.js`                                                                                                           |
| 서버 라우트    | `server/src/routes/locations.js`                                                                                                                          |
| 문서           | `docs/01-overview.md`, `docs/03-requirements.md`, `docs/06-data-spec.md`, `docs/pr/pr-22-address-search-ui.md`, `docs/steps/step-22-address-search-ui.md` |

---

## 7. 검증 결과

| 검증 항목                                                    | 결과 |
| ------------------------------------------------------------ | ---- |
| `npm.cmd --prefix client run lint`                           | 통과 |
| `npm.cmd --prefix client run build`                          | 통과 |
| `node --check server/src/services/geocodingService.js`       | 통과 |
| `node --check server/src/controllers/locationsController.js` | 통과 |
| `node --check server/src/routes/locations.js`                | 통과 |

빌드 중 `VITE_KAKAO_MAP_KEY` 미설정 경고가 표시될 수 있다. 이번 Step의 주소 검색은 서버의 `KAKAO_REST_API_KEY`를 사용하므로 클라이언트 지도 키 경고와는 별개다.

---

## 8. 후속 확인

1. 실제 실행 환경에서 `KAKAO_REST_API_KEY`가 설정되어 있는지 확인
2. `사당로 14다길 2-2`처럼 상세 주소 검색 결과가 표시되는지 확인
3. 후보 선택 후 `코스 생성` 버튼이 활성화되는지 확인
4. 검색어만 입력하고 후보를 선택하지 않았을 때 `코스 생성` 버튼이 비활성인지 확인
5. GPS 현재 위치 사용 시 선택 주소 영역이 갱신되는지 확인
