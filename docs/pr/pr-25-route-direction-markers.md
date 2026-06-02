# PR #25. 지도 경로 방향 표시 보완

> 관련 작업 계획서: [docs/plans/plan-25-route-direction-markers.md](../plans/plan-25-route-direction-markers.md)  
> 관련 Step 문서: [docs/steps/step-25-route-direction-markers.md](../steps/step-25-route-direction-markers.md)

---

## 브랜치 정보

| 항목 | 값 |
| ---- | -- |
| 작업 브랜치 | `feat/step-25-route-direction-markers` 권장 |
| 병합 대상 | `dev` |
| 상태 | 완료 |

---

## PR 제목

```text
[Step 25] 지도 경로 방향 표시 보완
```

---

## 개요

지도에 표시되는 ORS 생성형 코스가 일부 겹쳐 보일 때 진행 방향을 더 쉽게 알 수 있도록 경로 위 방향 화살표를 추가했다.

실제 카카오맵에서는 ORS `geometry.coordinates`를 기준으로 경로 중간 지점을 샘플링하고, 각 구간의 진행 각도에 맞춰 Kakao `CustomOverlay` 화살표를 표시한다. 카카오맵 SDK를 사용할 수 없는 fallback SVG 프리뷰에도 예시 경로 위 방향 화살표를 추가했다.

---

## 변경 파일 목록

| 구분 | 파일 | 변경 내용 |
| ---- | ---- | --------- |
| 수정 | `client/src/components/MapView.jsx` | 경로 길이/방위각 계산, 방향 화살표 오버레이 추가 |
| 수정 | `client/src/components/MapView.css` | 지도 방향 화살표 스타일 추가 |
| 수정 | `client/src/components/MapPreview.jsx` | SVG fallback 경로 방향 화살표 추가 |
| 수정 | `client/src/components/MapPreview.css` | fallback 방향 화살표 스타일 추가 |
| 수정 | `docs/01-overview.md` | 지도 경로 방향 표시 보정 기록 추가 |
| 수정 | `docs/03-requirements.md` | 지도 경로 방향 표시 요구사항 보정 기록 추가 |
| 신규 | `docs/plans/plan-25-route-direction-markers.md` | Step 25 작업 계획서 작성 |
| 신규 | `docs/steps/step-25-route-direction-markers.md` | Step 완료 문서 작성 |
| 신규 | `docs/pr/pr-25-route-direction-markers.md` | PR 요약 문서 작성 |

---

## 변경 이유

순환형 랜덤 코스는 실제 도로망을 따라 생성되므로 일부 도로를 다시 지나거나 가까운 구간이 겹쳐 보일 수 있다. 기존 단일 폴리라인 표시만으로는 사용자가 어느 방향으로 진행해야 하는지 판단하기 어려웠다.

경로 위에 방향 화살표를 추가하면 새 API나 DB 변경 없이 지도 가독성을 높일 수 있다.

---

## 동작 설명

- `routeCoordinates`가 2개 이상 있으면 방향 마커를 계산한다.
- 전체 경로 길이를 기준으로 compact 지도는 3개, 상세 지도는 5개 지점을 선택한다.
- 각 지점은 앞뒤 좌표의 방위각을 계산해 화살표 회전값으로 사용한다.
- 카카오맵에서는 `CustomOverlay`로 화살표를 표시한다.
- fallback SVG 지도에도 예시 화살표를 표시한다.

---

## 검증

```powershell
npm.cmd --prefix client run lint
npm.cmd --prefix client run build
```

| 항목 | 결과 |
| ---- | ---- |
| 클라이언트 Lint | 성공 |
| 클라이언트 Build | 성공 |
| 실제 지도 화살표 표시 | 브라우저에서 추가 확인 권장 |
| fallback 프리뷰 화살표 표시 | 코드 반영 |

---

## 후속 확인

- 실제 ORS 생성형 코스를 여러 번 생성해 겹치는 구간에서 화살표가 충분히 잘 보이는지 확인
- 모바일 375px 화면에서 compact 지도 화살표가 과밀하지 않은지 확인
- 필요하면 후속 단계에서 출발/도착 라벨을 더 명확히 분리
