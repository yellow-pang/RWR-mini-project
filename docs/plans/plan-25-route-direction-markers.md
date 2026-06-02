# 작업계획서 - Step 25: 지도 경로 방향 표시 보완

> **상태**: 구현 완료  
> **작성일**: 2026.06.02  
> **브랜치**: `feat/step-25-route-direction-markers` 권장  
> **목적**: 랜덤 생성 코스가 지도에서 겹쳐 보일 때 사용자가 진행 방향과 이동 순서를 더 쉽게 이해하도록 지도 표현을 보완한다.  
> **관련 문서**: [step-24-course-share.md](../steps/step-24-course-share.md) | [pr-24-course-share.md](../pr/pr-24-course-share.md)

---

## 1. 작업 배경

주소 기반 ORS 순환 코스는 실제 도로망을 따라 생성되므로 일부 구간이 겹치거나 가까이 지나갈 수 있다. 현재 지도는 경로를 단일 폴리라인으로 표시하기 때문에, 같은 선 위를 어느 방향으로 이동하는지 사용자가 판단하기 어렵다.

Step 25에서는 서버 응답 형식, DB 스키마, 외부 API 설정을 바꾸지 않고 클라이언트 지도 표시만 보완한다.

---

## 2. 목표

- `MapView`에서 `routeCoordinates`가 있는 경우 경로 위에 번호 마커와 진행 방향 마커를 표시한다.
- 출발/도착 지점을 기본 파란 핀이 아니라 의미가 명확한 커스텀 마커로 표시한다.
- 전체 경로는 연한 초록색, 출발 구간은 진한 초록색으로 표시한다.
- 결과 카드의 compact 지도와 상세 화면 지도 모두 순서와 방향 힌트를 제공한다.
- 카카오맵 SDK를 사용할 수 없는 fallback `MapPreview`에도 같은 힌트를 추가한다.
- 새 npm 패키지, DB 변경, Docker 변경, 환경변수 변경은 하지 않는다.

---

## 3. 구현 방향

| 항목           | 결정                            | 이유                                                             |
| -------------- | ------------------------------- | ---------------------------------------------------------------- |
| 방향 표시 방식 | 경로 중간 지점의 원형 방향 마커 | 선 옆에 떠 있는 표시보다 경로 일부처럼 보여 이해하기 쉬움        |
| 순서 표시 방식 | 경로 중간 지점의 번호 마커      | 랜덤 코스의 이동 순서를 한눈에 파악할 수 있음                    |
| 출발/도착 표시 | 커스텀 endpoint 마커            | 기본 파란 핀보다 의미가 명확함                                   |
| 출발 구간 강조 | 진한 초록색 보조 폴리라인       | 실시간 위치가 없어도 처음 가야 할 방향을 강조할 수 있음          |
| 계산 기준      | GeoJSON 좌표 배열 `[lng, lat]`  | ORS 응답의 기존 `geometry.coordinates`를 그대로 활용             |
| 지도 SDK       | Kakao `CustomOverlay`           | 별도 패키지 없이 지도 위 HTML 마커를 올릴 수 있음                |
| 표시 개수      | compact 3개, 상세 5개           | 작은 지도에서는 과밀을 피하고 상세 지도에서는 충분한 힌트를 제공 |
| 보조 표시      | Kakao Polyline `endArrow`       | 경로가 끝나는 방향을 추가로 보여줌                               |
| fallback       | SVG 경로 위 원형 방향 마커      | SDK 미로딩 상태에서도 같은 사용성을 유지                         |

---

## 4. 예상 변경 파일

| 파일                                            | 변경 내용                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| `client/src/components/MapView.jsx`             | 경로 샘플링, 출발/도착 마커, 번호 마커, 방향 마커, 출발 구간 강조, `endArrow` 추가 |
| `client/src/components/MapView.css`             | endpoint/번호/방향 마커 스타일 추가                                                |
| `client/src/components/MapPreview.jsx`          | fallback SVG에 출발/도착, 번호, 방향 마커와 출발 구간 강조 추가                    |
| `client/src/components/MapPreview.css`          | fallback 경로/마커 스타일 추가                                                     |
| `docs/01-overview.md`                           | 지도 방향 표시 보정 기록 추가                                                      |
| `docs/03-requirements.md`                       | 지도 방향 표시 요구사항 보정 기록 추가                                             |
| `docs/steps/step-25-route-direction-markers.md` | 완료 문서 작성                                                                     |
| `docs/pr/pr-25-route-direction-markers.md`      | PR 요약 문서 작성                                                                  |

---

## 5. 검증 항목

- ORS 생성형 코스 결과 카드 지도에 출발/도착, 번호, 방향 마커가 표시되는지 확인
- 상세 화면 지도에 출발/도착, 번호, 방향 마커가 표시되는지 확인
- SDK fallback `MapPreview`에도 같은 힌트가 표시되는지 확인
- `npm.cmd --prefix client run lint`
- `npm.cmd --prefix client run build`
