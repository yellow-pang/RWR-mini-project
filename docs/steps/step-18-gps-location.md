# Step 18. GPS 기반 추천 옵션 추가

> 작성일: 2026.05.31  
> 브랜치: `feat/gps-location-sorting`  
> 작업 계획서: [docs/plans/plan-18-gps-location.md](../plans/plan-18-gps-location.md)  
> 관련 PR 문서: [docs/pr/pr-18-gps-location.md](../pr/pr-18-gps-location.md)

---

## 1. 작업 목표

RWR의 최종 목표를 "현재 위치 기반 랜덤 운동 코스 자동 추천"으로 정리하고, 실제 라우팅 API 연동 전 단계로 GPS 추천 옵션과 위치 취득/fallback 기반을 추가한다.

---

## 2. 방향 보정 내용

초기 MVP 문서에는 GPS 기능이 "가까운 코스 우선 정렬" 또는 Haversine 거리 계산 중심으로 기록되어 있었다. 이는 고정 DB 코스를 빠르게 활용하기 위한 MVP 중심 계획이었다.

Step 18에서는 이 내용을 무조건 삭제하지 않고, 다음 문서에 변경 사유를 남겨 보정했다.

| 문서                      | 보정 내용                                             |
| ------------------------- | ----------------------------------------------------- |
| `docs/01-overview.md`     | GPS 기능을 랜덤 운동 코스 자동 추천 기반으로 수정     |
| `docs/03-requirements.md` | GPS 기반 추천 옵션 FR-25~29 추가                      |
| `docs/06-data-spec.md`    | 생성형 GPS 코스 저장은 후속 스키마 확장 대상으로 기록 |
| `docs/08-schedule.md`     | Haversine 정렬 계획을 fallback/보조 후보로 정리       |
| `docs/10-roadmap.md`      | GPS 기능을 자동 코스 추천 방향으로 보정               |

---

## 3. 구현 내용

### 추천 방식 옵션

홈 화면에 추천 방식을 추가했다.

- 랜덤 코스: 기존 PostgreSQL 코스 랜덤 추천
- GPS 자동 추천: 현재 위치 확인 후, Step 18에서는 기존 DB 추천으로 fallback

### Geolocation 유틸

`client/src/utils/geolocation.js`를 추가해 브라우저 위치 취득 로직을 컴포넌트 밖으로 분리했다.

### 추천 메타 상태

`CourseProvider`에 추천 방식과 fallback 안내를 담는 상태를 추가했다.

```text
recommendationMode
recommendationMeta
```

### fallback 안내

결과 화면에서 GPS 추천 모드의 fallback 사유를 표시한다.

- 위치 허용: 실제 경로 생성은 다음 단계에서 연결됨
- 위치 거부/실패: 위치 확인 불가로 기존 랜덤 코스 추천

---

## 4. 개인정보 정책

- 위치 권한 요청은 사용자가 GPS 자동 추천을 선택하고 추천 버튼을 누를 때만 발생한다.
- Step 18에서는 위치 좌표를 서버로 전송하지 않는다.
- API 요청은 기존 `GET /api/courses/random` 조건 파라미터만 사용한다.

---

## 5. 검증 결과

| 항목  | 명령                | 결과 |
| ----- | ------------------- | ---- |
| Lint  | `npm.cmd run lint`  | 성공 |
| Build | `npm.cmd run build` | 성공 |

---

## 6. 후속 작업

다음 단계에서는 ORS Round Trip API 연동을 통해 실제 도로망 기반 경로를 생성하고, 카카오맵 polyline 표시까지 확장한다.

검토할 항목:

- ORS API 키 관리 방식
- 클라이언트 직접 호출 vs 서버 프록시
- 사용자 위치 외부 API 전송 안내
- 생성형 코스 즐겨찾기/이력 저장 여부
- 경로 좌표 저장 시 개인정보 정책
