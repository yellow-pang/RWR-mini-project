# Step 27. 추천 목표 거리/시간 정확도 개선

> 작성일: 2026.06.03  
> 브랜치: `feat/route-target-accuracy`  
> 작업 계획서: [docs/plans/plan-27-route-target-accuracy.md](../plans/plan-27-route-target-accuracy.md)  
> 관련 PR 문서: [docs/pr/pr-27-route-target-accuracy.md](../pr/pr-27-route-target-accuracy.md)

---

## 1. 작업 목표

사용자가 선택한 거리 또는 시간 기준에 더 가까운 생성형 랜덤 코스를 추천하도록 조건 선택 UX와 ORS 후보 검증 로직을 개선했다.

이번 Step의 핵심 기준은 아래와 같다.

- 거리 기준과 시간 기준 분리
- 걷기 4km/h, 조깅 7km/h, 러닝 9km/h 기준 계산
- 거리/시간 프리셋과 직접 설정 제공
- ORS 실제 경로 거리/시간 기준으로 후보 검증
- 조건에 맞는 후보가 없으면 저장 DB 코스 fallback 없이 실패 안내
- 결과 카드에 목표값, 실제 추천값, 목표와의 차이 표시

---

## 2. 변경 전후 요약

| 구분      | 변경 전                                       | 변경 후                                                     |
| --------- | --------------------------------------------- | ----------------------------------------------------------- |
| 추천 기준 | 거리와 시간을 동시에 선택                     | `거리 기준` 또는 `시간 기준` 중 하나 선택                   |
| 거리 선택 | 1km, 3km, 5km                                 | 1km, 2km, 3km, 5km, 직접 설정                               |
| 시간 선택 | 15분, 30분, 60분                              | 15분, 30분, 45분, 60분, 직접 설정                           |
| 계산 기준 | 선택값을 API에 전달                           | 운동 유형별 속도로 목표 거리/예상 시간 계산                 |
| 추천 검증 | ORS 생성 결과를 충분히 목표값과 비교하지 않음 | 여러 후보의 실제 거리/시간을 검증하고 가장 가까운 후보 선택 |
| 실패 처리 | 순환 코스는 저장 DB 코스 fallback 가능        | 목표 검증 실패 시 억지 추천 없이 실패 안내                  |
| 결과 표시 | 거리, 시간, 유형 중심                         | 목표 거리/시간, 실제 추천 거리/예상 시간, 차이 표시         |

---

## 3. 중요 변경 내용

### 3.1 추천 기준 UX 분리

홈 화면에 `추천 기준` 선택 영역을 추가했다. 사용자는 `거리 기준` 또는 `시간 기준` 중 하나를 선택한다.

거리 기준에서는 거리 프리셋을 보여주고, 시간 기준에서는 시간 프리셋을 보여준다. 두 기준을 동시에 선택하지 않으므로 사용자가 어떤 기준으로 추천받는지 더 명확해졌다.

### 3.2 프리셋과 직접 설정

거리 프리셋은 `1km / 2km / 3km / 5km / 직접 설정`으로 확장했다. 시간 프리셋은 `15분 / 30분 / 45분 / 60분 / 직접 설정`으로 확장했다.

직접 설정을 누르면 슬라이더가 표시된다.

| 기준 | 범위         | 단위  |
| ---- | ------------ | ----- |
| 거리 | 0.5km ~ 10km | 0.5km |
| 시간 | 5분 ~ 120분  | 5분   |

### 3.3 운동 유형별 계산

운동 유형별 속도는 아래 기준을 사용한다.

| 운동 유형 | 속도  |
| --------- | ----- |
| 걷기      | 4km/h |
| 조깅      | 7km/h |
| 러닝      | 9km/h |

거리 기준에서는 예상 시간을 계산한다.

```js
estimatedMinutes = (targetDistanceKm / speedKmPerHour) * 60;
```

시간 기준에서는 목표 거리를 계산한다.

```js
targetDistanceKm = speedKmPerHour * (targetMinutes / 60);
```

### 3.4 ORS 실제 경로 검증

서버는 ORS 후보를 여러 개 생성하고, 각 후보의 실제 `summary.distance`를 목표 거리와 비교한다.

허용 오차는 아래 기준을 사용한다.

| 목표 거리 | 허용 오차 |
| --------- | --------- |
| 1km 이하  | ±30%      |
| 3km 이하  | ±20%      |
| 5km 이상  | ±15%      |

허용 범위 안에 들어오는 후보가 여러 개면 목표 거리와 가장 가까운 후보를 반환한다. 통과 후보가 없으면 실패 응답을 반환한다.

### 3.5 순환 코스 처리

순환 코스는 ORS `round_trip.length`에 목표 거리를 전달하되, 최종 추천 여부는 ORS가 반환한 전체 경로의 실제 거리로 판단한다.

기존처럼 목표 거리와 랜덤 반경을 동일하게 보지 않고, 완성된 전체 순환 경로 기준으로 검증한다.

### 3.6 출발-도착 코스 처리

출발-도착 코스는 먼저 출발지와 도착지만 포함한 기본 ORS 경로를 확인한다.

기본 경로가 이미 목표 허용 범위보다 길면, 랜덤 경유지를 억지로 조정하지 않고 안내 메시지를 반환한다. 기본 경로가 목표에 맞거나 목표보다 짧으면 랜덤 경유지 후보를 만들어 실제 거리 기준으로 가장 가까운 후보를 선택한다.

### 3.7 결과 카드 표시

생성형 ORS 코스에는 `targetSummary`를 포함한다. 결과 카드는 이 값을 사용해 아래 정보를 보여준다.

- 목표 거리
- 목표 시간
- 실제 추천 거리
- 예상 시간
- 목표와의 차이

---

## 4. 변경 파일 상세

| 구분 | 파일                                          | 변경 내용                                                                   |
| ---- | --------------------------------------------- | --------------------------------------------------------------------------- |
| 수정 | `client/src/constants/courseOptions.js`       | 추천 기준, 거리/시간 프리셋, 직접 설정 범위, 운동 유형 속도 상수 추가       |
| 수정 | `client/src/context/CourseProvider.jsx`       | `targetMode`, 직접 설정 상태 추가                                           |
| 수정 | `client/src/utils/courseDisplay.js`           | 목표 거리/시간 계산과 표시 포맷터 추가                                      |
| 수정 | `client/src/pages/HomePage.jsx`               | 거리/시간 기준 분리 UI, 직접 설정 슬라이더, 예상 정보 표시, 목표값 API 전달 |
| 수정 | `client/src/pages/ResultPage.jsx`             | 다시 추천 요청 목표값 보정, 조건 배지 표시 개선                             |
| 수정 | `client/src/api/routes.js`                    | 목표 모드와 계산값을 요청 body에 포함                                       |
| 수정 | `client/src/components/CourseCard.jsx`        | 목표값, 실제값, 차이 표시                                                   |
| 수정 | `client/src/components/CourseCard.css`        | 목표 요약 박스 스타일 추가                                                  |
| 수정 | `client/src/hooks/useFavoriteStatus.js`       | 저장 DB 코스 ID가 아닐 때 즐겨찾기 API 호출 방지                            |
| 수정 | `client/src/utils/history.js`                 | 저장 DB 코스 ID 판별 함수와 이력 저장 방어 추가                             |
| 수정 | `client/src/pages/HistoryPage.jsx`            | 저장 DB 코스만 즐겨찾기 토글 가능하도록 방어                                |
| 수정 | `client/src/index.css`                        | 프리셋 칩, 추천 기준, 직접 설정 슬라이더, 예상 정보 스타일 추가             |
| 수정 | `server/src/routes/routes.js`                 | 생성형 경로 API의 거리/시간/목표값 검증 범위 확장                           |
| 수정 | `server/src/controllers/routesController.js`  | 저장 DB fallback 제거, targetSummary 메타 응답 추가                         |
| 수정 | `server/src/controllers/historyController.js` | 존재하지 않는 코스 이력 저장 시 404 응답 처리                               |
| 수정 | `server/src/controllers/favoritesController.js` | 존재하지 않는 코스 즐겨찾기 저장 시 404 응답 처리                         |
| 수정 | `server/src/services/orsService.js`           | ORS 후보 생성, 목표 거리 검증, 최적 후보 선택 로직 추가                     |
| 수정 | `docs/03-requirements.md`                     | Step 27 요구사항 보정 기록 추가                                             |
| 수정 | `docs/06-data-spec.md`                        | Step 27 데이터 보정 기록 추가                                               |
| 신규 | `docs/plans/plan-27-route-target-accuracy.md` | 작업 계획 문서 작성                                                         |
| 신규 | `docs/steps/step-27-route-target-accuracy.md` | 구현 완료 문서 작성                                                         |
| 신규 | `docs/pr/pr-27-route-target-accuracy.md`      | PR 요약 문서 작성                                                           |

---

## 5. 변경하지 않은 항목

| 항목                      | 변경 여부 | 이유                                       |
| ------------------------- | --------- | ------------------------------------------ |
| DB 스키마                 | 변경 없음 | 생성형 코스 목표 검증은 응답 기반으로 처리 |
| seed 데이터               | 변경 없음 | 저장 DB 코스를 기준 데이터로 되살리지 않음 |
| Docker 설정               | 변경 없음 | 기존 실행 구조 그대로 사용                 |
| 환경변수                  | 변경 없음 | 기존 ORS/Kakao 설정 재사용                 |
| npm 패키지                | 추가 없음 | 계산과 UI는 기존 JS/React로 구현           |
| 생성형 코스 저장/즐겨찾기 | 변경 없음 | 영속 ID와 복원 정책이 아직 없음            |

---

## 6. 검증 결과

| 검증 항목                                                 | 결과 |
| --------------------------------------------------------- | ---- |
| `node --check server/src/services/orsService.js`          | 통과 |
| `node --check server/src/controllers/routesController.js` | 통과 |
| `node --check server/src/routes/routes.js`                | 통과 |
| `node --check server/src/controllers/historyController.js` | 통과 |
| `node --check server/src/controllers/favoritesController.js` | 통과 |
| `npm.cmd --prefix client run lint`                        | 통과 |
| `npm.cmd --prefix client run build`                       | 통과 |

---

## 7. 남은 확인 사항

- 실제 ORS API 키가 있는 환경에서 후보 5개 생성 시 응답 시간이 과도하지 않은지 확인
- 1km 이하 목표에서 실제 2km 이상 코스가 차단되는지 브라우저에서 확인
- 출발-도착 기본 경로가 목표보다 긴 주소 조합에서 안내 메시지가 자연스럽게 보이는지 확인
- 모바일 375px 화면에서 5개 프리셋 칩과 직접 설정 슬라이더가 답답하지 않은지 확인
- 후속 Step에서 운동 유형별 거리 프리셋과 지도 중심 바텀시트 UI 검토
