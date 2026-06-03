# PR #28. 지도 중심 홈 화면과 코스 조건 조작 개선

> 관련 작업 계획서: [docs/plans/plan-28-map-first-route-controls.md](../plans/plan-28-map-first-route-controls.md)  
> 관련 Step 문서: [docs/steps/step-28-map-first-route-controls.md](../steps/step-28-map-first-route-controls.md)

---

## 브랜치 정보

| 항목 | 값 |
| ---- | -- |
| 작업 브랜치 | `feat/step-28-map-first-route-controls` |
| 병합 대상 | `dev` |
| 상태 | 완료 |

---

## PR 제목

```text
[Step 28] 지도 중심 홈 화면과 코스 조건 조작 개선
```

---

## 개요

홈 화면을 지도 중심 UX로 재구성했다. 모바일에서는 지도와 하단 고정 조건 패널을 사용하고, 데스크톱에서는 왼쪽 조건 패널과 오른쪽 지도 구조를 사용한다.

거리 기준 추천은 운동 유형별 거리 프리셋으로 보정했다. 출발-도착 코스에는 출발지/도착지 바꾸기 버튼과 우회 강도 선택을 추가했다. 우회 강도는 point-to-point 요청의 `detourLevel`로 서버에 전달되며, 서버는 이 값에 따라 랜덤 경유지 수와 offset을 조정한다.

POI 기반 경유지는 외부 API와 fallback 정책이 필요하므로 이번 PR에서는 제외하고 후속 Step으로 분리했다.

---

## 변경 파일 목록

| 구분 | 파일 | 변경 내용 |
| ---- | ---- | --------- |
| 수정 | `client/src/constants/courseOptions.js` | 운동 유형별 거리 프리셋과 우회 강도 옵션 추가 |
| 수정 | `client/src/context/CourseProvider.jsx` | `detourLevel` 상태와 출발/도착 교환 함수 추가 |
| 수정 | `client/src/pages/HomePage.jsx` | 지도 중심 레이아웃, 하단 조건 패널, 출발/도착 바꾸기, 우회 강도 UI 추가 |
| 수정 | `client/src/pages/ResultPage.jsx` | 다시 추천 요청에 `detourLevel` 유지 |
| 수정 | `client/src/api/routes.js` | point-to-point 요청 body에 `detourLevel` 포함 |
| 수정 | `client/src/index.css` | 모바일/데스크톱 지도 중심 반응형 레이아웃 추가 |
| 수정 | `server/src/routes/routes.js` | `detourLevel` 검증 추가 |
| 수정 | `server/src/controllers/routesController.js` | `detourLevel` 전달과 meta 응답 추가 |
| 수정 | `server/src/services/orsService.js` | 우회 강도별 경유지 수와 offset 조정 |
| 수정 | `docs/03-requirements.md` | Step 28 요구사항 보정 기록 추가 |
| 수정 | `docs/06-data-spec.md` | `detourLevel` 데이터 보정 기록 추가 |
| 수정 | `docs/plans/plan-28-map-first-route-controls.md` | 상태를 구현 완료로 갱신 |
| 신규 | `docs/steps/step-28-map-first-route-controls.md` | Step 완료 문서 |
| 신규 | `docs/pr/pr-28-map-first-route-controls.md` | PR 요약 문서 |

---

## 동작 설명

- 홈 화면은 지도 영역과 조건 조작 영역으로 분리된다.
- 모바일에서는 조건 영역이 하단 고정 패널처럼 보인다.
- 데스크톱에서는 조건 패널과 지도가 좌우로 배치된다.
- 거리 기준에서 걷기, 조깅, 러닝별 거리 프리셋을 다르게 표시한다.
- 출발-도착 코스에서는 출발지와 도착지를 버튼으로 교환할 수 있다.
- 출발-도착 코스에서는 `가볍게 / 적당히 / 많이` 우회 강도를 선택할 수 있다.
- 서버는 `light / medium / strong`에 따라 경유지 개수와 offset을 조정한다.
- ORS 실제 거리 검증은 기존 Step 27 정책을 유지한다.

---

## 검증

```powershell
node --check server/src/services/orsService.js
node --check server/src/controllers/routesController.js
node --check server/src/routes/routes.js
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
```

| 항목 | 결과 |
| ---- | ---- |
| 서버 JS 문법 확인 | 성공 |
| 클라이언트 Lint | 성공 |
| 클라이언트 Build | 성공 |
| 실제 ORS 경로 생성 | 브라우저에서 추가 확인 권장 |

---

## 후속 확인

- POI 기반 경유지 후보 생성
- 드래그 가능한 3단계 바텀시트
- 실제 모바일 브라우저에서 하단 패널 체감 확인
- 우회 강도별 ORS 응답 시간과 실패율 확인
