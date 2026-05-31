# PR #18. GPS 기반 추천 옵션 추가

> 관련 작업 계획서: [docs/plans/plan-18-gps-location.md](../plans/plan-18-gps-location.md)  
> 관련 Step 문서: [docs/steps/step-18-gps-location.md](../steps/step-18-gps-location.md)

---

## 브랜치 정보

| 항목        | 값                          |
| ----------- | --------------------------- |
| 작업 브랜치 | `feat/gps-location-sorting` |
| 병합 대상   | `dev`                       |
| 상태        | 완료                        |

---

## PR 제목

```text
[Step 18] GPS 기반 추천 옵션과 fallback 구조 추가
```

---

## 개요

MVP 문서에서 GPS 기능이 "가까운 코스 우선 정렬" 중심으로 정리되어 있던 내용을 점검하고,
RWR의 최종 목표인 "현재 위치 기반 랜덤 운동 코스 자동 추천" 방향으로 보정했다.

실제 ORS 라우팅 연동 전 단계로 홈 화면에 `랜덤 코스` / `GPS 자동 추천` 옵션을 추가했다.
`GPS 자동 추천`을 선택하면 Geolocation API로 현재 위치 권한을 요청하고, Step 18에서는 아직
경로 생성 엔진이 없으므로 기존 DB 랜덤 추천으로 fallback한다.

---

## 변경 파일 목록

| 구분 | 파일                                          | 변경 내용                                                 |
| ---- | --------------------------------------------- | --------------------------------------------------------- |
| 신규 | `client/src/constants/recommendationModes.js` | 추천 방식 상수와 GPS fallback 안내 메시지 추가            |
| 신규 | `client/src/utils/geolocation.js`             | `navigator.geolocation.getCurrentPosition` 래퍼 유틸 추가 |
| 수정 | `client/src/context/CourseProvider.jsx`       | 추천 방식과 추천 메타 상태 추가                           |
| 수정 | `client/src/pages/HomePage.jsx`               | GPS 추천 옵션 UI, 위치 취득, 기존 랜덤 추천 fallback 연결 |
| 수정 | `client/src/pages/ResultPage.jsx`             | GPS fallback 안내 메시지 표시 및 다시 추천 흐름 유지      |
| 수정 | `client/src/index.css`                        | 추천 방식 선택 UI 스타일 추가                             |
| 수정 | `docs/01-overview.md`                         | GPS 기능 방향 보정 기록 추가                              |
| 수정 | `docs/03-requirements.md`                     | GPS 기반 추천 옵션 요구사항(FR-25~29) 추가                |
| 수정 | `docs/06-data-spec.md`                        | 생성형 GPS 코스 저장은 후속 스키마 확장 대상으로 기록     |
| 수정 | `docs/08-schedule.md`                         | Haversine 정렬 계획을 fallback/보조 후보로 보정           |
| 수정 | `docs/10-roadmap.md`                          | GPS 로드맵을 자동 코스 추천 방향으로 보정                 |
| 신규 | `docs/plans/plan-18-gps-location.md`          | Step 18 작업 계획서 작성                                  |
| 신규 | `docs/pr/pr-18-gps-location.md`               | PR 문서 작성                                              |
| 신규 | `docs/steps/step-18-gps-location.md`          | Step 완료 문서 작성                                       |

---

## 변경 이유

기존 GPS 계획은 PostgreSQL에 저장된 고정 코스를 빠르게 활용하기 위한 MVP 중심 접근이었다.
그러나 "현재 위치 + 목표 거리 + 소요 시간 + 운동 유형"을 바탕으로 매일 다른 운동 코스를
추천한다는 최종 목표와는 차이가 있었다.

따라서 기존 DB 코스 추천은 MVP 핵심 기능이자 fallback으로 유지하고, GPS 기능은 향후
ORS Round Trip API 기반 자동 경로 생성으로 확장할 수 있도록 추천 모드와 위치 취득 구조를
먼저 분리했다.

---

## 동작 설명

- **랜덤 코스**: 기존과 동일하게 `GET /api/courses/random`으로 PostgreSQL 코스 중 1개 추천
- **GPS 자동 추천**: 추천 버튼 클릭 시 브라우저 위치 권한 요청
- **위치 허용**: 현재 위치 확인 후 Step 18에서는 기존 DB 랜덤 추천으로 fallback
- **위치 거부/실패**: 안내 메시지를 표시하고 기존 DB 랜덤 추천으로 fallback
- **개인정보 정책**: 위치 좌표는 서버 API query/body에 포함하지 않음

---

## 문서 보정 내용

| 문서                      | 보정 내용                                              |
| ------------------------- | ------------------------------------------------------ |
| `docs/01-overview.md`     | GPS 기능을 "랜덤 운동 코스 자동 추천 기반"으로 보정    |
| `docs/03-requirements.md` | GPS 기반 추천 옵션 요구사항 추가                       |
| `docs/06-data-spec.md`    | 생성형 코스 저장은 후속 스키마 확장 대상으로 기록      |
| `docs/08-schedule.md`     | Haversine 가까운 코스 정렬을 fallback/보조 후보로 정리 |
| `docs/10-roadmap.md`      | GPS 기능의 장기 방향을 자동 코스 추천으로 보정         |

---

## 검증

```powershell
cd client
npm.cmd run lint
npm.cmd run build
```

| 항목  | 결과 |
| ----- | ---- |
| Lint  | 성공 |
| Build | 성공 |

---

## 후속 작업

- ORS Round Trip API 연동 방식 결정
- 현재 위치와 목표 거리 기반 순환 경로 생성
- 카카오맵 polyline 표시
- 생성형 코스 즐겨찾기/이력 저장 여부 및 DB 스키마 확장 검토
