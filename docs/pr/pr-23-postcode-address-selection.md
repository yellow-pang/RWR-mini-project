# PR #23. 우편번호 서비스 기반 주소 선택 UX 개선

> 관련 작업 계획서: [docs/plans/plan-23-postcode-address-selection.md](../plans/plan-23-postcode-address-selection.md)  
> 관련 Step 문서: [docs/steps/step-23-postcode-address-selection.md](../steps/step-23-postcode-address-selection.md)

---

## 브랜치 정보

| 항목        | 값                                        |
| ----------- | ----------------------------------------- |
| 작업 브랜치 | `feat/step-23-postcode-address-selection` |
| 병합 대상   | `dev`                                     |
| 상태        | 완료                                      |

---

## PR 제목

```text
[Step 23] 우편번호 서비스 기반 주소 선택 UX 개선
```

---

## 개요

Step 22의 카카오 Local API 주소 검색 결과 목록 UI를 Kakao 우편번호 서비스 기반 주소 선택 UI로 대체했다.

사용자는 홈 화면의 `주소 찾기` 버튼으로 페이지 안에 우편번호 검색 레이어를 열고, 도로명/지번/건물명 검색 결과에서 정확한 주소를 선택한다. 주소 선택 직후 클라이언트는 기존 서버 `POST /api/locations/geocode`로 좌표 변환을 요청하고, 좌표 변환에 성공한 경우에만 `routeLocation`에 주소와 좌표를 저장한다.

GPS `현재 위치 사용` 버튼은 유지하며, 현재 위치 좌표를 얻은 경우에도 기존처럼 코스 생성 기준점으로 사용할 수 있다.

---

## 변경 파일 목록

| 구분 | 파일                                               | 변경 내용                                                          |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------ |
| 수정 | `client/src/pages/HomePage.jsx`                    | 우편번호 서비스 레이어 열기, 주소 선택, 즉시 좌표 변환 흐름 구현   |
| 수정 | `client/src/api/locations.js`                      | `POST /api/locations/geocode` 호출 함수 추가                       |
| 신규 | `client/src/utils/postcode.js`                     | 우편번호 서비스 스크립트 로딩 및 선택 주소 추출 유틸 추가          |
| 수정 | `client/src/index.css`                             | 주소 찾기 버튼, 우편번호 iframe 레이어, 선택 주소 영역 스타일 추가 |
| 수정 | `docs/01-overview.md`                              | 우편번호 서비스 기반 주소 선택 보정 기록 추가                      |
| 수정 | `docs/03-requirements.md`                          | 주소 선택 직후 좌표 변환 요구사항 기록 추가                        |
| 수정 | `docs/06-data-spec.md`                             | 우편번호 서비스와 geocode API 역할 분리 명세 추가                  |
| 신규 | `docs/plans/plan-23-postcode-address-selection.md` | Step 23 작업 계획서 작성                                           |
| 신규 | `docs/pr/pr-23-postcode-address-selection.md`      | PR 문서 작성                                                       |
| 신규 | `docs/steps/step-23-postcode-address-selection.md` | Step 완료 문서 작성                                                |

---

## 변경 이유

카카오 Local 주소 검색 API는 주소를 좌표로 변환하는 데 적합하지만, `사당로 14다길`처럼 도로명 일부를 입력했을 때 하위 건물번호 후보를 풍부하게 보여주는 주소 입력 UX에는 한계가 있다.

따라서 주소 후보 선택은 우편번호 서비스에 맡기고, 선택된 주소를 기존 카카오 Local REST API 기반 서버 geocode API로 좌표 변환하는 구조로 역할을 분리했다.

---

## 동작 설명

- 사용자는 홈 화면에서 `주소 찾기` 버튼을 누른다.
- 클라이언트는 Kakao 우편번호 서비스 스크립트를 필요한 시점에 로드한다.
- 스크립트 로드 후 주소 섹션 안에 iframe 레이어를 표시한다.
- 사용자는 우편번호 서비스에서 도로명, 지번, 건물명으로 주소를 검색하고 후보를 선택한다.
- 선택 주소는 `POST /api/locations/geocode`로 전달되어 좌표 변환된다.
- 좌표 변환에 성공하면 선택 주소와 좌표를 `routeLocation`에 저장한다.
- 좌표 변환에 실패하면 `routeLocation`을 초기화하고 코스 생성 기준점으로 확정하지 않는다.
- `코스 생성` 버튼은 거리, 시간, 운동 유형, 선택 주소/좌표가 모두 있을 때 활성화된다.
- `현재 위치 사용` 버튼은 유지되며 GPS 좌표를 얻으면 선택 주소 영역을 갱신한다.

---

## API Key 정책

- Kakao 우편번호 서비스는 별도 key 없이 클라이언트 스크립트로 사용한다.
- 선택 주소의 좌표 변환은 서버 환경변수 `KAKAO_REST_API_KEY`를 사용하는 기존 `/api/locations/geocode` API가 담당한다.
- 클라이언트에는 카카오 REST API key를 노출하지 않는다.
- 실제 `.env` 값은 커밋하지 않는다.

---

## 검증

```powershell
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
```

| 항목                       | 결과                                            |
| -------------------------- | ----------------------------------------------- |
| 클라이언트 Lint            | 성공                                            |
| 클라이언트 Build           | 성공                                            |
| 실제 우편번호 레이어 표시  | 부분 확인 필요 (브라우저 네트워크 필요)         |
| 실제 카카오 주소 좌표 변환 | 부분 확인 필요 (`KAKAO_REST_API_KEY` 설정 필요) |
| 실제 ORS 경로 생성         | 부분 확인 필요 (`ORS_API_KEY` 설정 필요)        |

---

## 후속 작업

- 실제 모바일 브라우저에서 우편번호 iframe 높이와 스크롤 동작 확인
- 좌표 변환 실패가 잦은 주소 유형이 있으면 geocode fallback 또는 주소 조합 방식 보완
- 필요 시 상세주소 표시 입력은 후속 단계에서 개인정보 저장 정책과 함께 검토
