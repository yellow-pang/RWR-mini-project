# PR #22. 주소 검색 결과 선택 UI 추가

> 관련 작업 계획서: [docs/plans/plan-22-address-search-ui.md](../plans/plan-22-address-search-ui.md)  
> 관련 Step 문서: [docs/steps/step-22-address-search-ui.md](../steps/step-22-address-search-ui.md)

---

## 브랜치 정보

| 항목        | 값                               |
| ----------- | -------------------------------- |
| 작업 브랜치 | `feat/step-22-address-search-ui` |
| 병합 대상   | `dev`                            |
| 상태        | 완료                             |

---

## PR 제목

```text
[Step 22] 주소 검색 결과 선택 UI 추가
```

---

## 개요

Step 21에서 주소 입력 중심 코스 생성 흐름을 추가했지만, 사용자가 입력한 자유 텍스트 주소가 항상 정확한 좌표로 변환되는 것은 아니다.

이번 Step에서는 홈 화면 출발 주소 영역을 검색어 입력과 선택 주소 표시 영역으로 분리했다. 사용자는 카카오 Local API 검색 결과 후보 중 하나를 선택하고, 선택된 주소와 좌표가 있을 때만 `코스 생성`을 실행할 수 있다.

GPS `현재 위치 사용` 버튼은 유지하며, 좌표→주소 변환 성공 시 선택 주소 영역에 주소를 표시하고 실패 시에는 `현재 위치 기준` 좌표를 추천 기준점으로 사용한다.

---

## 변경 파일 목록

| 구분 | 파일                                            | 변경 내용                                                        |
| ---- | ----------------------------------------------- | ---------------------------------------------------------------- |
| 수정 | `client/src/pages/HomePage.jsx`                 | 주소 검색어, 검색 결과 목록, 선택 주소 표시 UI 및 상태 추가      |
| 수정 | `client/src/api/locations.js`                   | `POST /api/locations/search` 호출 함수 추가                      |
| 수정 | `client/src/index.css`                          | 2행 2열 주소 검색 UI, 검색 결과 목록, 선택 주소 영역 스타일 추가 |
| 수정 | `server/src/services/geocodingService.js`       | 카카오 주소 검색 결과 목록 변환 함수 추가                        |
| 수정 | `server/src/controllers/locationsController.js` | 주소 검색 컨트롤러 추가                                          |
| 수정 | `server/src/routes/locations.js`                | `POST /api/locations/search` 라우트 및 검증 추가                 |
| 수정 | `docs/01-overview.md`                           | 주소 검색 결과 선택 UI 보정 기록 추가                            |
| 수정 | `docs/03-requirements.md`                       | 선택된 주소/좌표 기준 코스 생성 요구사항 기록 추가               |
| 수정 | `docs/06-data-spec.md`                          | `/locations/search` API 명세 추가                                |
| 신규 | `docs/pr/pr-22-address-search-ui.md`            | PR 문서 작성                                                     |
| 신규 | `docs/steps/step-22-address-search-ui.md`       | Step 완료 문서 작성                                              |

---

## 변경 이유

주소를 자유 텍스트로 한 번에 입력하면 도로명 상세 주소, 지번 주소, 건물명, 빌라 주소 등 표기 차이 때문에 카카오 주소 변환 결과가 없거나 사용자가 의도하지 않은 좌표가 선택될 수 있다.

따라서 사용자가 검색어로 후보 주소를 조회한 뒤, 직접 후보를 선택하는 흐름으로 기준 위치를 명확히 했다. 이제 코스 생성은 입력 문자열이 아니라 선택된 주소와 좌표를 기준으로 실행된다.

---

## 동작 설명

- 사용자는 홈 화면에서 주소 검색어를 입력한다.
- `검색` 버튼 또는 Enter 키로 `/api/locations/search`를 호출한다.
- 서버는 카카오 Local API 주소 검색 결과를 최대 10개 후보로 변환해 반환한다.
- 클라이언트는 도로명 주소를 우선 표시하고, 지번 주소와 건물명/지역 정보를 보조 텍스트로 보여준다.
- 사용자가 후보를 선택하면 선택된 주소와 좌표를 `routeLocation`에 저장한다.
- `코스 생성` 버튼은 거리, 시간, 운동 유형, 선택 주소/좌표가 모두 있을 때 활성화된다.
- 검색어만 입력하고 후보를 선택하지 않은 상태에서는 코스를 생성할 수 없다.
- `현재 위치 사용` 버튼은 유지되며 GPS 좌표를 얻으면 선택 주소 영역을 갱신한다.

---

## API Key 정책

- 카카오 REST API key는 서버 환경변수 `KAKAO_REST_API_KEY`로만 사용한다.
- 클라이언트는 `/api/locations/search` 서버 프록시를 호출하며 카카오 REST API key를 직접 노출하지 않는다.
- 실제 `.env` 값은 커밋하지 않는다.

---

## 검증

```powershell
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
node --check server/src/services/geocodingService.js
node --check server/src/controllers/locationsController.js
node --check server/src/routes/locations.js
```

| 항목                  | 결과                                            |
| --------------------- | ----------------------------------------------- |
| 클라이언트 Lint       | 성공                                            |
| 클라이언트 Build      | 성공                                            |
| 서버 수정 파일 검사   | 성공                                            |
| 실제 카카오 주소 검색 | 부분 확인 필요 (`KAKAO_REST_API_KEY` 설정 필요) |
| 실제 ORS 경로 생성    | 부분 확인 필요 (`ORS_API_KEY` 설정 필요)        |

> 빌드 중 `VITE_KAKAO_MAP_KEY` 미설정 경고가 표시될 수 있지만, 해당 값은 지도 표시용 클라이언트 키이며 이번 주소 검색 API는 서버 REST 키를 사용한다.

---

## 후속 작업

- 실제 실행 환경에서 상세 주소 검색 결과가 충분히 노출되는지 확인
- 자주 실패하는 주소 유형이 있으면 검색어 안내 문구 또는 후보 표시 필드 보완
- 후속 단계에서 필요 시 주소 검색 모달, 지도 기반 위치 선택, 사용자 주소 저장 정책 검토
