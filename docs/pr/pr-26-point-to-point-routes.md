# PR #26. 출발-도착 분리 랜덤 코스 생성

> 관련 작업 계획서: [docs/plans/plan-26-point-to-point-routes.md](../plans/plan-26-point-to-point-routes.md)  
> 관련 Step 문서: [docs/steps/step-26-point-to-point-routes.md](../steps/step-26-point-to-point-routes.md)

---

## 브랜치 정보

| 항목 | 값 |
| ---- | -- |
| 작업 브랜치 | `feat/step-26-point-to-point-routes` |
| 병합 대상 | `dev` |
| 상태 | 완료 |

---

## PR 제목

```text
[Step 26] 출발-도착 분리 랜덤 코스 생성
```

---

## 개요

기존 주소 기반 순환 코스 생성 흐름에 더해, 출발지와 도착지를 따로 선택하는 산책형 이동 코스 생성 모드를 추가했다.

사용자는 홈 화면에서 `순환 코스`와 `출발-도착 코스`를 선택할 수 있다. 순환 코스는 기존 `address-round-trip` API를 그대로 사용하고, 출발-도착 코스는 신규 `address-point-to-point` API를 통해 출발지, 랜덤 경유지, 도착지를 순서대로 ORS에 전달한다.

출발-도착 코스에서 선택한 거리는 전체 예상 거리로 해석한다. 출발지와 도착지가 이미 선택 거리보다 멀 것으로 판단되면 우회 경유지를 줄이고 안내 문구를 표시한다. ORS 실패 시 저장 DB 코스 fallback은 하지 않으며, 서버 내부에서 경유지를 바꿔 최대 3회 재시도한 뒤 최종 실패 메시지를 반환한다.

---

## 변경 파일 목록

| 구분 | 파일 | 변경 내용 |
| ---- | ---- | --------- |
| 수정 | `client/src/context/CourseProvider.jsx` | `routeMode`, `destinationLocation` 상태 추가 |
| 수정 | `client/src/pages/HomePage.jsx` | 코스 방식 선택, 출발/도착 주소 선택, 모드별 코스 생성 분기 추가 |
| 수정 | `client/src/pages/ResultPage.jsx` | 다시 추천 시 모드별 API 호출 분기 |
| 수정 | `client/src/api/routes.js` | `createAddressPointToPointRoute` 추가 |
| 수정 | `client/src/constants/recommendationModes.js` | route mode 상수와 안내 문구 추가 |
| 수정 | `client/src/components/CourseCard.jsx` | 출발-도착 생성형 코스 배지 표시 |
| 수정 | `client/src/components/MapView.jsx` | `pointToPoint` 경로 출발/도착 마커 분리 |
| 수정 | `client/src/index.css` | 주소 버튼 행과 모드 선택 UI 반응형 보정 |
| 수정 | `server/src/routes/routes.js` | `POST /api/routes/address-point-to-point` 라우트 추가 |
| 수정 | `server/src/controllers/routesController.js` | 출발/도착 위치 해석과 신규 컨트롤러 추가 |
| 수정 | `server/src/services/orsService.js` | point-to-point ORS 호출, 랜덤 경유지, 최대 3회 재시도 추가 |
| 수정 | `docs/01-overview.md` | Step 26 보정 기록 추가 |
| 수정 | `docs/03-requirements.md` | Step 26 요구사항 보정 기록 추가 |
| 수정 | `docs/06-data-spec.md` | 신규 API와 생성형 데이터 보정 기록 추가 |
| 수정 | `docs/plans/plan-26-point-to-point-routes.md` | 구현 완료 상태 반영 |
| 신규 | `docs/steps/step-26-point-to-point-routes.md` | Step 완료 문서 작성 |
| 신규 | `docs/pr/pr-26-point-to-point-routes.md` | PR 요약 문서 작성 |

---

## 변경 이유

사용자 테스트에서 순환 코스뿐 아니라 특정 출발지에서 특정 목적지까지 이동하면서 주변을 산책하고 싶은 수요가 확인되었다.

단순 최단 경로는 RWR의 랜덤 산책 경험과 맞지 않으므로, 출발지와 목적지 사이에 랜덤 경유지를 추가해 산책형 이동 경로를 만든다. 다만 생성형 코스 저장 정책은 아직 정의되지 않았으므로 DB 스키마 변경 없이 응답 기반 생성형 코스로 처리했다.

---

## 동작 설명

- 홈 화면에서 `순환 코스`와 `출발-도착 코스` 중 하나를 선택한다.
- 순환 코스는 기존 출발 주소 또는 현재 위치만 필요하다.
- 출발-도착 코스는 출발지와 도착지 좌표가 모두 확정되어야 생성 버튼이 활성화된다.
- 현재 위치 사용 버튼은 출발지에만 제공된다.
- 신규 API는 출발지/도착지 주소 또는 좌표를 검증한다.
- 서버는 출발지와 도착지 사이에 거리 조건별 1~3개 랜덤 경유지를 만든다.
- 출발지와 도착지 사이의 기본 거리가 선택 거리보다 길 것으로 보이면 우회 경유지를 최소화한다.
- ORS 실패 시 경유지를 바꿔 최대 3회까지 재시도한다.
- 3회 모두 실패하면 저장 DB 코스 fallback 없이 실패 메시지를 반환한다.
- 생성형 출발-도착 코스는 즐겨찾기 버튼을 숨기고 공유만 제공한다.

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

- POI 기반 경유지 선택
- 우회 강도 조절
- 점심 산책/퇴근 산책 같은 상황 프리셋
- 출발지와 도착지 바꾸기 버튼
- 생성형 코스 저장/즐겨찾기/딥링크 복원 정책
