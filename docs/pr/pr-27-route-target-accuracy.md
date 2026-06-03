# PR #27. 추천 목표 거리/시간 정확도 개선

> 관련 작업 계획서: [docs/plans/plan-27-route-target-accuracy.md](../plans/plan-27-route-target-accuracy.md)  
> 관련 Step 문서: [docs/steps/step-27-route-target-accuracy.md](../steps/step-27-route-target-accuracy.md)

---

## 브랜치 정보

| 항목        | 값                           |
| ----------- | ---------------------------- |
| 작업 브랜치 | `feat/route-target-accuracy` |
| 병합 대상   | `dev`                        |
| 상태        | 완료                         |

---

## PR 제목

```text
[Step 27] 추천 목표 거리/시간 정확도 개선
```

---

## 개요

거리와 시간을 동시에 선택하던 추천 조건 UX를 `거리 기준`과 `시간 기준`으로 분리했다. 사용자는 거리 기준에서는 목표 거리를, 시간 기준에서는 목표 시간을 선택한다. 운동 유형별 속도 기준을 사용해 예상 시간 또는 예상 거리를 계산해 보여준다.

서버는 ORS 후보 경로를 여러 개 생성하고, 실제 `summary.distance`, `summary.duration`을 기준으로 목표 범위 안에 들어오는 후보만 통과시킨다. 통과 후보가 여러 개이면 목표 거리와 가장 가까운 후보를 반환한다.

조건에 맞는 생성형 코스를 찾지 못하면 저장 DB 코스로 억지 fallback하지 않고 실패 안내를 반환한다.

---

## 변경 파일 목록

| 구분 | 파일                                          | 변경 내용                                              |
| ---- | --------------------------------------------- | ------------------------------------------------------ |
| 수정 | `client/src/constants/courseOptions.js`       | 추천 기준, 프리셋, 직접 설정 범위, 운동 유형 속도 추가 |
| 수정 | `client/src/context/CourseProvider.jsx`       | targetMode와 직접 설정 상태 추가                       |
| 수정 | `client/src/utils/courseDisplay.js`           | 거리/시간 계산과 표시 포맷터 추가                      |
| 수정 | `client/src/pages/HomePage.jsx`               | 거리/시간 기준 분리 UI와 예상 정보 표시                |
| 수정 | `client/src/pages/ResultPage.jsx`             | 다시 추천 요청과 조건 배지 보정                        |
| 수정 | `client/src/api/routes.js`                    | 목표 모드와 계산값 요청 body 추가                      |
| 수정 | `client/src/components/CourseCard.jsx`        | 목표값, 실제값, 목표 차이 표시                         |
| 수정 | `client/src/components/CourseCard.css`        | 목표 요약 박스 스타일 추가                             |
| 수정 | `client/src/hooks/useFavoriteStatus.js`       | 저장 DB 코스 ID가 아닐 때 즐겨찾기 API 호출 방지       |
| 수정 | `client/src/utils/history.js`                 | 저장 DB 코스 ID 판별과 이력 저장 방어 추가             |
| 수정 | `client/src/pages/HistoryPage.jsx`            | 저장 DB 코스만 즐겨찾기 토글 가능하도록 방어           |
| 수정 | `client/src/index.css`                        | 프리셋/직접 설정/예상 정보 UI 스타일 추가              |
| 수정 | `server/src/routes/routes.js`                 | 생성형 라우트 API 입력 검증 확장                       |
| 수정 | `server/src/controllers/routesController.js`  | targetSummary 응답 메타 추가, 저장 DB fallback 제거    |
| 수정 | `server/src/controllers/historyController.js` | 존재하지 않는 코스 이력 저장 시 404 응답 처리          |
| 수정 | `server/src/controllers/favoritesController.js` | 존재하지 않는 코스 즐겨찾기 저장 시 404 응답 처리    |
| 수정 | `server/src/services/orsService.js`           | 후보 생성, 실제 거리 검증, 최적 후보 선택 추가         |
| 수정 | `docs/03-requirements.md`                     | Step 27 요구사항 보정 기록 추가                        |
| 수정 | `docs/06-data-spec.md`                        | Step 27 데이터 보정 기록 추가                          |
| 신규 | `docs/plans/plan-27-route-target-accuracy.md` | 작업 계획 문서                                         |
| 신규 | `docs/steps/step-27-route-target-accuracy.md` | Step 완료 문서                                         |
| 신규 | `docs/pr/pr-27-route-target-accuracy.md`      | PR 요약 문서                                           |

---

## 동작 설명

- 홈 화면에서 코스 방식, 추천 기준, 운동 유형을 선택한다.
- 거리 기준 선택 시 거리 프리셋 또는 직접 설정으로 목표 거리를 정한다.
- 시간 기준 선택 시 시간 프리셋 또는 직접 설정으로 목표 시간을 정한다.
- 걷기 4km/h, 조깅 7km/h, 러닝 9km/h 기준으로 예상 거리/시간을 계산한다.
- 서버는 ORS 후보를 최대 5개 생성하고 실제 거리 기준으로 허용 오차를 검증한다.
- 허용 오차는 1km 이하 ±30%, 3km 이하 ±20%, 5km 이상 ±15%를 사용한다.
- 결과 카드에는 목표 거리, 목표 시간, 실제 추천 거리, 예상 시간, 목표와의 차이를 표시한다.

---

## 검증

```powershell
node --check server/src/services/orsService.js
node --check server/src/controllers/routesController.js
node --check server/src/routes/routes.js
node --check server/src/controllers/historyController.js
node --check server/src/controllers/favoritesController.js
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
```

| 항목               | 결과                        |
| ------------------ | --------------------------- |
| 서버 JS 문법 확인  | 성공                        |
| 클라이언트 Lint    | 성공                        |
| 클라이언트 Build   | 성공                        |
| 실제 ORS 경로 생성 | 브라우저에서 추가 확인 권장 |

---

## 후속 확인

- 실제 API 환경에서 후보 5개 생성 시 응답 시간 확인
- 운동 유형별 거리 프리셋 분리
- 지도 중심 바텀시트 UI
- POI 기반 경유지 선택
- 생성형 코스 저장/즐겨찾기/딥링크 복원 정책
