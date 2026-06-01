# Step 23. 우편번호 서비스 기반 주소 선택 UX 개선

> 작성일: 2026.06.01  
> 브랜치: `feat/step-23-postcode-address-selection`  
> 작업 계획서: [docs/plans/plan-23-postcode-address-selection.md](../plans/plan-23-postcode-address-selection.md)  
> 관련 PR 문서: [docs/pr/pr-23-postcode-address-selection.md](../pr/pr-23-postcode-address-selection.md)

---

## 1. 작업 목표

Step 22에서는 카카오 Local API의 주소 검색 결과 목록을 홈 화면에 보여주고, 사용자가 후보를 선택하면 해당 주소/좌표를 코스 생성 기준 위치로 저장했다.

Step 23에서는 이 방식을 Kakao 우편번호 서비스 기반 주소 선택으로 바꿨다. 목표는 도로명 일부, 건물명, 지번 검색에서 더 익숙하고 정확한 주소 선택 UX를 제공하고, 선택된 주소만 기존 서버 geocode API로 좌표 변환하는 것이다.

---

## 2. 중요 변경 요약

### 2.1 주소 검색 목록 UI를 우편번호 서비스로 대체

Step 22의 홈 화면 주소 영역에는 검색어 입력칸, 검색 버튼, 주소 검색 결과 목록이 있었다.

이번 변경 후에는 사용자가 `주소 찾기` 버튼을 누르면 주소 섹션 안에 Kakao 우편번호 서비스 iframe 레이어가 열린다. 주소 검색과 후보 선택은 우편번호 서비스 UI에서 처리한다.

추가 UX 피드백을 반영해 `주소 찾기`와 `현재 위치`는 같은 행에 배치했다. 두 버튼은 출발지 설정을 위한 수평적 대안으로 보이게 했고, 모바일에서도 텍스트가 과도하게 눌리지 않도록 아이콘과 짧은 문구를 함께 사용했다.

또한 우편번호 iframe은 일반 문서 흐름에 삽입하지 않고 주소 카드 내부의 absolute overlay로 띄운다. 주소 찾기 레이어를 열어도 선택 주소, 안내 문구, 아래 조건 섹션이 아래로 밀리지 않아 layout shift를 줄인다.

### 2.2 주소 선택 직후 좌표 변환

우편번호 서비스는 주소 선택까지만 담당한다. 선택된 주소는 클라이언트가 `POST /api/locations/geocode`로 보내 좌표를 즉시 확인한다.

좌표 변환 성공 시:

- 선택 주소를 `routeLocation.address`에 저장
- 변환 좌표를 `routeLocation.latitude`, `routeLocation.longitude`에 저장
- `코스 생성` 버튼 활성화 조건 충족 가능

좌표 변환 실패 시:

- `routeLocation`을 초기화
- 실패 안내 표시
- 코스 생성 비활성 유지

### 2.3 우편번호 스크립트 로딩 유틸 추가

변경 파일: `client/src/utils/postcode.js`

추가 기능:

- 우편번호 서비스 스크립트 동적 로딩
- 이미 로드된 경우 중복 로드 방지
- 로드 실패 시 에러 반환
- 우편번호 서비스 응답에서 선택 주소 추출

사용 스크립트:

```text
https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js
```

### 2.4 GPS 보조 기능 유지

`현재 위치 사용` 버튼은 그대로 유지했다. GPS 좌표 취득과 좌표→주소 변환 흐름은 기존 Step 21~22 동작을 유지한다.

GPS 좌표가 있으면 우편번호 서비스 주소 선택 없이도 코스 생성 기준점으로 사용할 수 있다.

---

## 3. 클라이언트 변경 내용

### 3.1 API 모듈

변경 파일: `client/src/api/locations.js`

추가 함수:

```js
geocodeAddress({ address });
```

HomePage는 선택 주소의 좌표 변환을 이 함수로 요청한다. 컴포넌트에서 직접 `fetch`를 호출하지 않는다.

### 3.2 HomePage 상태와 이벤트

변경 파일: `client/src/pages/HomePage.jsx`

추가된 상태:

- `isPostcodeOpen`: 우편번호 iframe 레이어 표시 여부
- `isPostcodeLoading`: 우편번호 스크립트 로딩 상태
- `isGeocodingAddress`: 선택 주소 좌표 변환 상태
- `postcodeMessage`: 우편번호/좌표 변환 관련 안내 메시지

추가된 ref:

- `postcodeLayerRef`: 우편번호 iframe을 삽입할 DOM 영역

주요 동작:

- `주소 찾기` 클릭 시 우편번호 스크립트 로드
- 스크립트 로드 후 `new kakao.Postcode(...).embed(...)`로 레이어 렌더링
- 주소 선택 시 레이어 닫기
- 선택 주소를 서버 geocode API로 좌표 변환
- 성공 시 `routeLocation` 저장
- 실패 시 `routeLocation` 초기화

### 3.3 스타일

변경 파일: `client/src/index.css`

추가된 스타일:

- 주소 찾기/현재 위치 가로 버튼 영역
- 우편번호 레이어 닫기 버튼
- 카드 내부 absolute iframe overlay
- 모바일 폭에서 우편번호 레이어 높이 조정

---

## 4. 서버 변경 내용

서버 로직은 새로 추가하지 않았다.

사용한 기존 API:

```text
POST /api/locations/geocode
```

Step 22에서 만든 `POST /api/locations/search`는 호환용으로 유지하지만, 홈 화면에서는 더 이상 사용하지 않는다.

---

## 5. 변경된 사용자 흐름

### 5.1 우편번호 서비스로 주소 선택

```text
주소 찾기 클릭
→ Kakao 우편번호 서비스 스크립트 로드
→ 홈 화면 안에 iframe 주소 검색 레이어 표시
→ 사용자가 도로명/지번/건물명으로 주소 검색
→ 주소 후보 선택
→ /api/locations/geocode로 좌표 변환
→ 성공 시 routeLocation에 주소/좌표 저장
→ 거리/시간/운동 유형 선택
→ 코스 생성
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

| 구분              | 파일                                                                                                                                                                        |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 클라이언트 UI     | `client/src/pages/HomePage.jsx`                                                                                                                                             |
| 클라이언트 API    | `client/src/api/locations.js`                                                                                                                                               |
| 클라이언트 아이콘 | `client/src/components/Icon.jsx`                                                                                                                                            |
| 클라이언트 유틸   | `client/src/utils/postcode.js`                                                                                                                                              |
| 클라이언트 CSS    | `client/src/index.css`                                                                                                                                                      |
| 문서              | `docs/01-overview.md`, `docs/03-requirements.md`, `docs/06-data-spec.md`, `docs/pr/pr-23-postcode-address-selection.md`, `docs/steps/step-23-postcode-address-selection.md` |

---

## 7. 검증 결과

| 검증 항목                           | 결과 |
| ----------------------------------- | ---- |
| `npm.cmd --prefix client run lint`  | 통과 |
| `npm.cmd --prefix client run build` | 통과 |

빌드 검증은 통과했다. 실제 우편번호 서비스 iframe 표시와 선택 주소 좌표 변환은 외부 스크립트 로딩, 서버 실행, `KAKAO_REST_API_KEY` 설정이 필요한 런타임 확인 항목이다.

---

## 8. 후속 확인

1. 실제 브라우저에서 `주소 찾기` 클릭 시 우편번호 레이어가 표시되는지 확인
2. `사당로 14다길` 검색 후 기대 주소 후보를 선택할 수 있는지 확인
3. 주소 선택 후 `/api/locations/geocode` 요청이 성공하는지 확인
4. 좌표 변환 성공 후 `코스 생성` 버튼이 활성화되는지 확인
5. 375px 모바일 폭에서 우편번호 레이어와 닫기 버튼이 겹치지 않는지 확인
