# Step 26. 출발-도착 분리 랜덤 코스 생성

> 작성일: 2026.06.03  
> 브랜치: `feat/step-26-point-to-point-routes`  
> 작업 계획서: [docs/plans/plan-26-point-to-point-routes.md](../plans/plan-26-point-to-point-routes.md)  
> 관련 PR 문서: [docs/pr/pr-26-point-to-point-routes.md](../pr/pr-26-point-to-point-routes.md)

---

## 1. 작업 목표

기존 주소 기반 순환 코스 생성에 더해, 사용자가 출발지와 도착지를 따로 선택하고 두 지점 사이를 산책하듯 걸을 수 있는 생성형 코스 모드를 추가했다.

이번 Step의 핵심 기준은 아래와 같다.

- 선택한 거리는 출발지부터 도착지까지의 전체 예상 거리로 처리
- 현재 위치 사용은 출발지 입력 보조로만 제공
- 도착지는 주소 검색으로만 선택
- ORS 실패 시 저장 DB 코스 fallback 없이 서버 내부에서 최대 3회 재시도
- 생성형 출발-도착 코스는 기존 생성형 ORS 코스처럼 즐겨찾기를 숨기고 공유만 제공

---

## 2. 변경 전후 요약

| 구분 | 변경 전 | 변경 후 |
| ---- | ------- | ------- |
| 코스 방식 | 출발지 기준 순환 코스만 생성 | `순환 코스`와 `출발-도착 코스` 선택 가능 |
| 주소 입력 | 출발 주소 1개 | 출발-도착 모드에서 출발지/도착지 각각 선택 |
| 현재 위치 | 출발 주소 보조 | 출발지 입력 보조로 유지 |
| ORS 호출 | `round_trip` 옵션 사용 | 출발지, 랜덤 경유지, 도착지를 `coordinates`로 전달 |
| 실패 처리 | 순환 코스는 가까운 저장 코스 fallback 가능 | 출발-도착 코스는 DB fallback 없이 최대 3회 재시도 후 실패 안내 |
| 지도 표시 | 순환 코스는 출발/도착 통합 가능 | 출발-도착 코스는 가까운 거리여도 출발/도착 분리 표시 |

---

## 3. 중요 변경 내용

### 3.1 코스 방식 선택 추가

홈 화면에 `순환 코스`와 `출발-도착 코스`를 선택하는 영역을 추가했다.

`순환 코스`는 기존 주소 기반 순환 생성 흐름을 그대로 사용한다. `출발-도착 코스`는 출발지와 도착지가 모두 좌표로 확정되어야 `코스 생성` 버튼이 활성화된다.

전역 상태에는 `routeMode`와 `destinationLocation`을 추가했다. 기존 `routeLocation`은 출발지로 계속 사용한다.

### 3.2 출발지/도착지 주소 선택

기존 Kakao 우편번호 서비스 레이어를 재사용하되, 주소 선택 대상이 출발지인지 도착지인지 구분하도록 `addressTarget` 상태를 추가했다.

출발지는 주소 검색 또는 현재 위치 사용으로 입력할 수 있다. 도착지는 사용자 혼동을 줄이기 위해 주소 검색으로만 선택한다.

### 3.3 서버 point-to-point API 추가

새 API `POST /api/routes/address-point-to-point`를 추가했다.

요청에는 출발지 주소/좌표, 도착지 주소/좌표, 거리, 시간, 운동 유형, seed가 포함된다. 서버는 좌표가 있으면 좌표를 우선 사용하고, 좌표가 없으면 주소를 geocode한다.

응답 데이터는 기존 생성형 ORS 코스와 같은 구조를 유지한다. 추가로 `routeMode: "pointToPoint"`를 포함해 화면에서 순환 코스와 구분할 수 있게 했다.

### 3.4 랜덤 경유지 생성

출발-도착 코스는 최단 보행 경로가 아니라 산책형 이동 코스를 목표로 한다. 그래서 서버에서 출발지와 도착지 사이의 중간점, 방향 벡터, 수직 방향 벡터를 계산해 1~3개의 랜덤 경유지를 만든다.

거리 조건별 기본 경유지 개수는 아래와 같다.

| 거리 | 경유지 수 |
| ---- | --------- |
| 1km | 1개 |
| 3km | 2개 |
| 5km | 3개 |

출발지와 도착지 사이의 기본 거리가 선택 거리보다 길 것으로 보이면 우회 경유지를 만들지 않거나 최소화한다. 이때 사용자가 오해하지 않도록 `meta.notice`에 안내 문구를 포함한다.

### 3.5 ORS 실패 재시도

경유지가 보행 불가능한 위치 근처로 잡히면 ORS가 경로 생성을 실패할 수 있다. 이를 줄이기 위해 서버는 같은 요청 안에서 seed를 바꿔 최대 3회까지 경유지를 다시 생성하고 ORS 요청을 재시도한다.

3회 모두 실패하면 저장 DB 코스 fallback을 하지 않는다. 출발-도착 목적지를 만족하지 않는 저장 코스를 보여주면 사용자가 기대한 결과와 어긋나기 때문이다.

### 3.6 지도 마커 보강

기존 지도는 시작점과 마지막 좌표가 가까우면 `출발/도착` 통합 마커를 표시했다. 출발-도착 코스에서는 두 지점이 가까운 경우에도 사용자가 목적지를 구분해야 하므로, `routeMode`가 `pointToPoint`이면 출발/도착 마커를 분리해서 표시하도록 보강했다.

---

## 4. 변경 파일 상세

| 구분 | 파일 | 변경 내용 |
| ---- | ---- | --------- |
| 수정 | `client/src/context/CourseProvider.jsx` | `routeMode`, `destinationLocation` 상태 추가 |
| 수정 | `client/src/pages/HomePage.jsx` | 코스 방식 선택, 출발/도착 주소 선택, point-to-point 생성 요청 분기 추가 |
| 수정 | `client/src/pages/ResultPage.jsx` | 다시 추천 시 코스 방식별 API 호출 분기 |
| 수정 | `client/src/api/routes.js` | `createAddressPointToPointRoute` 추가 |
| 수정 | `client/src/constants/recommendationModes.js` | route mode 상수와 출발-도착 안내 문구 추가 |
| 수정 | `client/src/components/CourseCard.jsx` | 출발-도착 생성형 코스 배지 표시 |
| 수정 | `client/src/components/MapView.jsx` | `pointToPoint` 경로의 출발/도착 마커 분리 표시 |
| 수정 | `client/src/index.css` | 코스 방식/주소 입력 영역 반응형 보정 |
| 수정 | `server/src/routes/routes.js` | `POST /api/routes/address-point-to-point` 검증과 라우트 추가 |
| 수정 | `server/src/controllers/routesController.js` | 출발/도착 위치 해석과 신규 컨트롤러 추가 |
| 수정 | `server/src/services/orsService.js` | point-to-point ORS 요청, 랜덤 경유지 생성, 최대 3회 재시도 로직 추가 |
| 수정 | `docs/01-overview.md` | Step 26 보정 기록 추가 |
| 수정 | `docs/03-requirements.md` | Step 26 요구사항 보정 기록 추가 |
| 수정 | `docs/06-data-spec.md` | 신규 API와 생성형 코스 데이터 보정 기록 추가 |
| 수정 | `docs/plans/plan-26-point-to-point-routes.md` | 상태를 구현 완료로 갱신 |
| 신규 | `docs/steps/step-26-point-to-point-routes.md` | 구현 완료 문서 작성 |
| 신규 | `docs/pr/pr-26-point-to-point-routes.md` | PR 요약 문서 작성 |

---

## 5. 변경하지 않은 항목

| 항목 | 변경 여부 | 이유 |
| ---- | --------- | ---- |
| DB 스키마 | 변경 없음 | 생성형 코스 저장 정책을 아직 정의하지 않음 |
| seed 데이터 | 변경 없음 | 저장 DB 코스 fallback을 사용하지 않음 |
| Docker 설정 | 변경 없음 | 기존 서버/클라이언트 실행 구조 그대로 사용 |
| 환경변수 | 변경 없음 | 기존 ORS/Kakao 설정을 재사용 |
| npm 패키지 | 추가 없음 | 좌표 계산을 자체 JS 유틸 로직으로 처리 |
| 생성형 코스 즐겨찾기 | 변경 없음 | 영속 ID와 복원 정책이 없어 계속 숨김 |

---

## 6. 사용자 관점 동작

사용자는 홈 화면에서 `순환 코스` 또는 `출발-도착 코스`를 선택한다.

`순환 코스`를 선택하면 기존처럼 출발지만 고르고 코스를 생성한다. `출발-도착 코스`를 선택하면 출발지와 도착지를 각각 선택해야 하며, 현재 위치 버튼은 출발지 입력에만 제공된다.

거리 버튼은 출발지부터 도착지까지의 전체 예상 거리로 해석된다. 출발지와 도착지가 이미 멀면 우회 경유지를 줄이고 안내 문구를 보여준다.

결과 화면과 상세 화면에서는 기존 생성형 코스처럼 지도, 코스 요약, 공유 버튼을 확인할 수 있다. 즐겨찾기 버튼은 노출되지 않는다.

---

## 7. 검증 결과

| 검증 항목 | 결과 |
| --------- | ---- |
| `node --check server/src/services/orsService.js` | 통과 |
| `node --check server/src/controllers/routesController.js` | 통과 |
| `node --check server/src/routes/routes.js` | 통과 |
| `npm.cmd --prefix client run lint` | 통과 |
| `npm.cmd --prefix client run build` | 통과 |

---

## 8. 남은 확인 사항

- 실제 ORS API 키가 있는 환경에서 출발-도착 코스가 의도대로 생성되는지 확인
- 선택 거리보다 출발-도착 기본 거리가 긴 케이스에서 안내 문구가 자연스럽게 보이는지 확인
- 모바일 375px 화면에서 출발지/도착지 주소 영역과 코스 방식 선택이 답답하지 않은지 확인
- 후속 Step에서 POI 기반 경유지, 우회 강도, 출발지/도착지 바꾸기 버튼을 검토
