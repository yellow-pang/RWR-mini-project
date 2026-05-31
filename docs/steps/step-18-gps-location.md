# Step 18. GPS 기반 추천 옵션 추가

> 작성일: 2026.05.31  
> 브랜치: `feat/gps-location-sorting`  
> 작업 계획서: [docs/plans/plan-18-gps-location.md](../plans/plan-18-gps-location.md)  
> 관련 PR 문서: [docs/pr/pr-18-gps-location.md](../pr/pr-18-gps-location.md)

---

## 1. 작업 목표

RWR의 GPS 기능 방향을 "가까운 기존 코스 정렬"에서 "현재 위치 기반 랜덤 운동 코스 자동 추천"으로 보정한다.

실제 ORS 라우팅 API 연동 전 단계로, 사용자가 추천 방식을 선택할 수 있게 하고 GPS 추천 선택 시
Geolocation API로 현재 위치 권한을 요청한다. Step 18에서는 경로 생성 엔진이 아직 없으므로
기존 PostgreSQL 랜덤 추천으로 fallback한다.

---

## 2. 변경 내용

| 구분 | 파일                                          | 설명                                                  |
| ---- | --------------------------------------------- | ----------------------------------------------------- |
| 신규 | `client/src/constants/recommendationModes.js` | 추천 방식 상수와 GPS fallback 안내 메시지 추가        |
| 신규 | `client/src/utils/geolocation.js`             | Geolocation 위치 취득 유틸 추가                       |
| 수정 | `client/src/context/CourseProvider.jsx`       | 추천 방식과 추천 메타 상태 추가                       |
| 수정 | `client/src/pages/HomePage.jsx`               | 추천 방식 UI와 GPS 위치 취득 fallback 흐름 추가       |
| 수정 | `client/src/pages/ResultPage.jsx`             | GPS fallback 안내 표시 및 다시 추천 흐름 유지         |
| 수정 | `client/src/index.css`                        | 추천 방식 선택 UI 스타일 추가                         |
| 수정 | `docs/01-overview.md`                         | GPS 기능 방향 보정 기록 추가                          |
| 수정 | `docs/03-requirements.md`                     | GPS 기반 추천 옵션 요구사항 추가                      |
| 수정 | `docs/06-data-spec.md`                        | 생성형 GPS 코스 저장은 후속 스키마 확장 대상으로 기록 |
| 수정 | `docs/08-schedule.md`                         | Haversine 정렬 계획을 fallback/보조 후보로 정리       |
| 수정 | `docs/10-roadmap.md`                          | GPS 기능을 자동 코스 추천 방향으로 보정               |
| 신규 | `docs/pr/pr-18-gps-location.md`               | PR 문서 작성                                          |

---

## 3. 변경 상세

### 3.1 추천 방식 옵션 추가

홈 화면에 추천 방식 선택 영역을 추가했다.

| 옵션          | 동작                                                  |
| ------------- | ----------------------------------------------------- |
| 랜덤 코스     | 기존 PostgreSQL 코스 랜덤 추천                        |
| GPS 자동 추천 | 현재 위치 권한 요청 후 기존 DB 랜덤 추천으로 fallback |

### 3.2 Geolocation 유틸 추가

`client/src/utils/geolocation.js`에서 브라우저 위치 취득 로직을 분리했다.

```js
export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      reject,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  });
}
```

### 3.3 추천 상태 확장

`CourseProvider`에 추천 방식과 결과 안내 메타 정보를 추가했다.

| 상태                 | 설명                          |
| -------------------- | ----------------------------- |
| `recommendationMode` | `random_db` 또는 `gps_route`  |
| `recommendationMeta` | GPS fallback 여부와 안내 문구 |

### 3.4 fallback 안내

GPS 자동 추천 모드에서는 결과 화면에 fallback 사유를 표시한다.

| 상황           | 안내                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| 위치 허용      | 실제 경로 생성은 다음 단계에서 연결되며 이번 추천은 기존 코스 fallback |
| 위치 거부/실패 | 위치 확인을 사용할 수 없어 기존 랜덤 코스로 추천                       |

---

## 4. 문서 보정 내용

초기 MVP 문서에는 GPS 기능이 "가까운 코스 우선 정렬" 또는 Haversine 거리 계산 중심으로 기록되어 있었다.
Step 18에서는 이 내용을 삭제하지 않고, 왜 방향이 달라졌는지 보정 기록을 남겼다.

| 문서                      | 보정 내용                                         |
| ------------------------- | ------------------------------------------------- |
| `docs/01-overview.md`     | GPS 기능을 랜덤 운동 코스 자동 추천 기반으로 수정 |
| `docs/03-requirements.md` | FR-25~29로 GPS 추천 옵션 요구사항 추가            |
| `docs/06-data-spec.md`    | 생성형 GPS 코스 저장은 후속 DB 확장 대상으로 기록 |
| `docs/08-schedule.md`     | Haversine 정렬 계획을 fallback/보조 후보로 정리   |
| `docs/10-roadmap.md`      | GPS 기능을 자동 코스 추천 방향으로 보정           |

---

## 5. 개인정보 정책

- 위치 권한 요청은 사용자가 `GPS 자동 추천`을 선택하고 추천 버튼을 누를 때만 발생한다.
- Step 18에서는 위치 좌표를 서버로 전송하지 않는다.
- API 요청은 기존 `GET /api/courses/random` 조건 파라미터만 사용한다.
- Step 19에서 ORS를 연동할 경우, 사용자 위치가 외부 API로 전송된다는 점을 별도 안내해야 한다.

---

## 6. 검증 결과

| 검증 항목           | 명령                | 결과 |
| ------------------- | ------------------- | ---- |
| ESLint              | `npm.cmd run lint`  | 통과 |
| Production build    | `npm.cmd run build` | 통과 |
| 위치 좌표 서버 전송 | 코드 경로 점검      | 없음 |

---

## 7. 후속 작업

다음 단계에서는 ORS Round Trip API 연동을 통해 실제 도로망 기반 경로를 생성하고,
카카오맵 polyline 표시까지 확장한다.

검토할 항목:

- ORS API 키 관리 방식
- 클라이언트 직접 호출 vs 서버 프록시
- 사용자 위치 외부 API 전송 안내
- 생성형 코스 즐겨찾기/이력 저장 여부
- 경로 좌표 저장 시 개인정보 정책
