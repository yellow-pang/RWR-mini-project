# 작업계획서 - Step 29: POI 기반 경유지 후보와 코스 분위기 선택

> **상태**: 구현 완료  
> **작성일**: 2026.06.03  
> **브랜치**: `feat/step-29-poi-waypoints`  
> **목적**: Kakao Local API로 부담이 적은 POI 후보를 찾고, 이를 생성형 경유지 후보로 활용해 랜덤 코스의 납득 가능성과 품질을 높인다.  
> **관련 문서**: [step-28-map-first-route-controls.md](../steps/step-28-map-first-route-controls.md) | [pr-28-map-first-route-controls.md](../pr/pr-28-map-first-route-controls.md)

---

## 1. 작업 배경

Step 28까지 RWR은 주소 기반 순환 코스와 출발-도착 코스, 목표 거리/시간 검증, 운동 유형별 프리셋, 우회 강도를 지원한다. 현재 출발-도착 코스의 랜덤 경유지는 출발지와 도착지 사이의 벡터와 수직 offset을 사용해 좌표를 계산한다.

이 방식은 외부 POI 데이터 없이도 동작하지만, 사용자가 볼 때 왜 그 방향으로 돌아가는지 납득하기 어렵고, 랜덤 경유지가 실제로 걷기 좋은 장소 주변인지 알기 어렵다.

이번 Step에서는 Kakao Local API를 사용해 주변 POI 후보를 찾고, 이를 경유지 후보로 활용한다. 다만 첨부 피드백처럼 POI를 "반드시 방문해야 하는 목적지"로 보여주면 부담이 커질 수 있으므로, RWR에서는 POI를 목적지가 아니라 **코스 분위기와 안전감을 만드는 힌트**로 사용한다.

---

## 2. 제안 비교와 선정

### 2.1 기존 제안

초기 제안은 아래 방향이었다.

```text
Kakao Local API 사용
출발-도착 코스 먼저 적용
공원/녹지 우선
실패 시 기존 랜덤 경유지 fallback
이번 Step에서는 UI 없이 서버 내부 개선
```

장점은 구현이 단순하고 위험이 작다는 점이다. 하지만 사용자가 어떤 분위기의 코스를 원하는지 선택할 수 없고, 결과에서도 왜 이 경유지가 선택되었는지 설명하기 어렵다.

### 2.2 첨부 피드백 기반 제안

첨부 피드백은 POI를 목적지가 아니라 "경유 성격"으로 다루고, 사용자가 코스 분위기를 선택하게 하는 방향을 제안한다.

```text
오늘 코스 분위기
[아무거나] [공원 위주] [하천/산책로] [카페 근처] [편의점 근처]
```

장점은 랜덤 코스의 부담을 줄이고, 결과 추천 이유를 설명하기 쉬워진다는 점이다. 단점은 UI와 서버 요청/응답 구조가 함께 늘어나므로 작업 범위가 커진다.

### 2.3 선정 방향

Step 29에서는 두 제안을 섞은 **코스 분위기 기반 POI 보조 후보 방식**을 채택한다.

```text
Kakao Local API 사용
POI는 목적지가 아니라 경유 후보/분위기 힌트로 사용
UI에는 코스 분위기 선택을 추가
출발-도착 코스 먼저 적용
같은 브랜치 안의 다음 커밋에서 순환 코스까지 확장
POI 실패 시 기존 랜덤 경유지 fallback
최종 추천 여부는 ORS 실제 거리 검증으로 판단
```

이 방식이 더 좋은 이유는 아래와 같다.

- 사용자가 "왜 이 코스인지" 이해하기 쉽다.
- POI 방문을 강제하지 않아 랜덤 부담이 줄어든다.
- 기존 랜덤 경유지 fallback을 유지해 Kakao API 실패에도 기능이 중단되지 않는다.
- 향후 `조용한 길`, `편의점 근처`, `공원 위주` 같은 개인화 UX로 확장하기 쉽다.

---

## 3. 목표

- Kakao Local API 기반 POI 검색 서비스를 서버에 추가한다.
- POI 카테고리는 내부 추상 카테고리와 Kakao 검색 키워드/카테고리 매핑을 분리한다.
- 홈 화면에 `코스 분위기` 선택 UI를 추가한다.
- POI는 사용자가 반드시 방문해야 하는 목적지가 아니라 경유지 후보로만 사용한다.
- 1차 커밋에서는 출발-도착 코스에 POI 후보를 적용한다.
- 2차 커밋에서는 같은 브랜치에서 순환 코스에 POI 후보를 적용한다.
- POI 검색 실패, 후보 없음, ORS 실패 시 기존 랜덤 경유지 생성으로 fallback한다.
- 결과 화면에는 POI 기반 추천 이유를 짧게 표시한다.
- DB 스키마, seed 데이터, 환경변수 이름은 변경하지 않는다.

---

## 4. 범위

### 포함

| 구분            | 포함 내용                                            |
| --------------- | ---------------------------------------------------- |
| 클라이언트 UI   | 홈 화면 `코스 분위기` 선택 추가                      |
| 클라이언트 요청 | 생성형 코스 요청에 `routeTheme` 또는 `poiTheme` 전달 |
| 서버 POI 서비스 | Kakao Local API를 사용한 주변 POI 검색               |
| 카테고리 매핑   | RWR 내부 테마와 Kakao 검색 파라미터 매핑             |
| 출발-도착 적용  | POI 후보를 출발-도착 경유지 후보로 우선 적용         |
| 순환 적용       | 같은 브랜치의 다음 커밋에서 순환 코스에도 적용       |
| fallback        | POI 실패 시 기존 랜덤 좌표 경유지 사용               |
| 결과 설명       | 추천 이유/메타에 POI 분위기 근거 추가                |
| 문서            | 요구사항/데이터 명세 보정, Step/PR 문서 작성         |

### 제외

| 구분                        | 제외 이유                                                         |
| --------------------------- | ----------------------------------------------------------------- |
| DB 스키마 변경              | POI 후보는 요청 단위 계산 결과로 처리 가능                        |
| seed 데이터 변경            | 저장 DB 코스를 기준 데이터로 되살리지 않음                        |
| 환경변수 이름 변경          | 기존 `KAKAO_REST_API_KEY` 재사용                                  |
| 새 npm 패키지               | 서버 fetch와 기존 React 상태로 구현 가능                          |
| POI 영속 저장               | 개인정보/위치 이력 정책이 필요해 후속 과제                        |
| 위험 장소 회피 엔진         | 실제 도로 위험도 데이터가 없어 문구와 안전 카테고리 중심으로 시작 |
| 네이버/Google/OSM 동시 지원 | Step 29에서는 Kakao Local API에 집중                              |

---

## 5. 사용자 흐름

### 5.1 출발-도착 코스

1. 사용자가 출발지와 도착지를 선택한다.
2. 사용자가 추천 기준, 운동 유형, 거리/시간, 우회 강도를 선택한다.
3. 사용자가 `코스 분위기`를 선택한다.
4. 클라이언트는 `routeTheme`을 point-to-point 요청에 포함한다.
5. 서버는 출발지/도착지 주변 또는 중간 지점 주변에서 POI 후보를 검색한다.
6. 서버는 부담이 적은 POI 후보를 경유지 후보로 변환한다.
7. ORS가 실제 경로를 생성한다.
8. Step 27의 목표 거리 검증을 통과한 후보 중 가장 가까운 코스를 반환한다.
9. POI 후보가 없거나 실패하면 기존 랜덤 경유지 방식으로 fallback한다.

### 5.2 순환 코스

1. 같은 브랜치의 다음 커밋에서 순환 코스에 POI 후보를 적용한다.
2. 사용자가 출발지와 코스 분위기를 선택한다.
3. 서버는 출발지 주변 POI를 검색한다.
4. POI 후보를 ORS round trip 대체 경유지 또는 Directions 기반 순환 후보로 활용한다.
5. 실제 거리 검증을 통과한 후보만 반환한다.
6. 실패하면 기존 ORS round trip 후보 생성으로 fallback한다.

---

## 6. UI 설계

홈 화면에 `코스 분위기` 섹션을 추가한다.

```text
코스 분위기
[아무거나] [공원 위주] [하천/산책로] [카페 근처] [편의점 근처]
```

초기 옵션은 아래로 제한한다.

| 표시명      | 내부 값       | 설명                                      |
| ----------- | ------------- | ----------------------------------------- |
| 아무거나    | `any`         | 기존 랜덤 경유지와 POI 후보를 함께 사용   |
| 공원 위주   | `park`        | 공원/녹지 주변 POI 우선                   |
| 하천/산책로 | `trail`       | 하천, 산책로, 걷기 좋은 장소 키워드 우선  |
| 카페 근처   | `cafe`        | 카페 방문 강제가 아니라 상권/밝은 길 느낌 |
| 편의점 근처 | `convenience` | 물/간식 구매 가능성이 있는 코스 느낌      |

UI 문구는 POI 방문을 강제하지 않도록 한다.

```text
선택한 장소를 목적지로 고정하지 않고, 코스 분위기를 만드는 힌트로 사용합니다.
```

---

## 7. POI 카테고리 정책

### 7.1 안전하게 시작할 후보

초기 후보는 부담이 적은 장소 위주로 제한한다.

```text
공원
하천/산책로
카페
편의점
공공시설
도서관
학교 주변
지하철역/버스정류장 근처
```

### 7.2 초기에 제외할 후보

초기 구현에서는 아래 장소를 명시적으로 추천 테마로 두지 않는다.

```text
술집
유흥시설
숙박업소
공사장
산길/등산로
너무 외진 장소
차량 중심 도로 주변
```

Kakao Local API만으로 모든 위험 장소를 완벽히 판별할 수는 없다. 따라서 Step 29에서는 위험 회피를 보장하지 않고, 부담이 적은 카테고리 위주로 후보를 제한한다.

---

## 8. 서버 설계

### 8.1 신규 서비스

예상 파일:

```text
server/src/services/poiService.js
server/src/constants/poiCategories.js
```

`poiService`는 기존 `geocodingService`와 같은 방식으로 `KAKAO_REST_API_KEY`를 사용한다. 클라이언트에는 Kakao REST API 키를 노출하지 않는다.

### 8.2 POI 검색 기준

출발-도착 코스는 아래 좌표를 중심으로 검색한다.

- 출발지
- 도착지
- 출발지와 도착지의 중간점

초기 반경은 목표 거리와 우회 강도를 고려해 제한한다.

| 목표 거리 | 검색 반경 |
| --------- | --------- |
| 1km 이하  | 500m      |
| 3km 이하  | 1000m     |
| 5km 이상  | 1500m     |

### 8.3 후보 변환

Kakao POI 응답은 아래 내부 구조로 변환한다.

```js
{
  id: "kakao-poi-...",
  name: "서울숲",
  category: "park",
  theme: "park",
  latitude: 37.5446,
  longitude: 127.0374,
  source: "kakao-local"
}
```

### 8.4 후보 선택

초기 점수는 복잡한 랭킹 대신 아래 조건을 사용한다.

1. 좌표가 유효한가?
2. 선택한 `routeTheme`과 맞는가?
3. 출발지/도착지에서 너무 멀리 벗어나지 않는가?
4. ORS 경로 생성 후 목표 거리 허용 범위를 통과하는가?
5. 통과 후보 중 목표 거리와 가장 가까운가?

---

## 9. API 설계 방향

기존 엔드포인트를 유지한다.

- `POST /api/routes/address-point-to-point`
- `POST /api/routes/address-round-trip`

요청 body에 `routeTheme`을 추가한다.

```json
{
  "routeTheme": "park",
  "detourLevel": "medium",
  "targetMode": "distance",
  "targetDistanceKm": 3
}
```

응답에는 POI 적용 정보를 `meta`와 생성형 코스 데이터에 포함한다.

```json
{
  "success": true,
  "data": {
    "poiSummary": {
      "routeTheme": "park",
      "usedPoi": true,
      "poiNames": ["서울숲"],
      "poiCategories": ["park"]
    }
  },
  "meta": {
    "routeTheme": "park",
    "usedPoi": true,
    "poiFallback": false,
    "notice": "공원 근처를 지나는 코스를 찾았습니다."
  }
}
```

POI를 사용하지 못한 경우:

```json
{
  "meta": {
    "routeTheme": "park",
    "usedPoi": false,
    "poiFallback": true,
    "notice": "주변 POI 후보가 부족해 기존 랜덤 경유지로 코스를 생성했습니다."
  }
}
```

---

## 10. 구현 순서와 커밋 단위

사용자 요청에 따라 같은 브랜치에서 두 단계로 나눈다.

### 10.1 1차 커밋: 출발-도착 코스 POI 적용

- `routeTheme` 상태와 UI 추가
- point-to-point 요청에 `routeTheme` 포함
- `poiService` 추가
- 출발/도착/중간점 주변 POI 검색
- POI 후보를 point-to-point 경유지 후보로 사용
- 실패 시 기존 랜덤 경유지 fallback
- 결과 추천 이유와 meta에 POI 정보 표시
- 문서 중간 보정

### 10.2 2차 커밋: 순환 코스 POI 적용

- round-trip 요청에 `routeTheme` 포함
- 출발지 주변 POI 후보 검색
- POI 후보를 순환 코스 후보 생성에 활용
- ORS round trip 실패 또는 POI 후보 부족 시 기존 round trip 로직 fallback
- 문서 최종 보정

---

## 11. 예상 변경 파일

| 파일                                         | 변경 내용                              |
| -------------------------------------------- | -------------------------------------- |
| `client/src/constants/courseOptions.js`      | 코스 분위기 옵션 추가                  |
| `client/src/context/CourseProvider.jsx`      | `routeTheme` 상태 추가                 |
| `client/src/pages/HomePage.jsx`              | 코스 분위기 선택 UI 추가               |
| `client/src/pages/ResultPage.jsx`            | POI 기반 추천 안내 표시                |
| `client/src/components/CourseCard.jsx`       | POI 추천 이유/분위기 요약 표시         |
| `client/src/api/routes.js`                   | 생성형 경로 요청에 `routeTheme` 포함   |
| `server/src/constants/poiCategories.js`      | RWR 테마와 Kakao 검색 매핑             |
| `server/src/services/poiService.js`          | Kakao Local POI 검색 서비스            |
| `server/src/routes/routes.js`                | `routeTheme` 검증 추가                 |
| `server/src/controllers/routesController.js` | `routeTheme` 전달과 meta 반영          |
| `server/src/services/orsService.js`          | POI 후보 기반 경유지 생성 및 fallback  |
| `docs/03-requirements.md`                    | Step 29 요구사항 보정 기록             |
| `docs/06-data-spec.md`                       | `routeTheme`, `poiSummary` 데이터 보정 |
| `docs/plans/plan-29-poi-waypoints.md`        | 작업 계획 문서                         |
| `docs/steps/step-29-poi-waypoints.md`        | 구현 완료 후 작성                      |
| `docs/pr/pr-29-poi-waypoints.md`             | PR 요약 문서                           |

---

## 12. 검증 항목

- 홈 화면에 코스 분위기 선택 UI가 표시되는지 확인
- `any / park / trail / cafe / convenience` 중 하나만 선택되는지 확인
- point-to-point 요청 body에 `routeTheme`이 포함되는지 확인
- round-trip 요청 body에 `routeTheme`이 포함되는지 확인
- 서버가 허용되지 않은 `routeTheme` 값을 검증 오류로 처리하는지 확인
- Kakao Local API 키가 없을 때 POI 검색 실패가 전체 경로 생성을 막지 않는지 확인
- POI 후보가 없으면 기존 랜덤 경유지 fallback이 동작하는지 확인
- POI 후보가 있어도 ORS 실제 거리 검증을 통과하지 못하면 억지 추천하지 않는지 확인
- 결과 화면에 POI 기반 추천 이유가 목적지 강제처럼 보이지 않는지 확인
- 순환 코스와 출발-도착 코스 모두 기존 다시 추천 흐름이 유지되는지 확인
- `node --check server/src/services/poiService.js`
- `node --check server/src/services/orsService.js`
- `node --check server/src/controllers/routesController.js`
- `node --check server/src/routes/routes.js`
- `npm.cmd --prefix client run lint`
- `npm.cmd --prefix client run build`

---

## 13. 확정 구현 기준

| 항목       | 기준                                           |
| ---------- | ---------------------------------------------- |
| POI 데이터 | Kakao Local API 사용                           |
| API 키     | 기존 `KAKAO_REST_API_KEY` 서버 환경변수 재사용 |
| 첫 적용    | 출발-도착 코스 먼저                            |
| 다음 적용  | 같은 브랜치 다음 커밋에서 순환 코스 적용       |
| UI         | 코스 분위기 선택 UI까지 포함                   |
| POI 성격   | 목적지가 아니라 경유 후보/분위기 힌트          |
| 기본 테마  | `any`                                          |
| 우선 테마  | 공원/녹지, 하천/산책로, 카페 근처, 편의점 근처 |
| fallback   | POI 실패 시 기존 랜덤 경유지 생성 사용         |
| 최종 판단  | ORS 실제 거리/시간 검증 우선                   |
| 저장 정책  | POI 후보와 생성형 코스는 DB에 저장하지 않음    |

---

## 14. 한계와 후속 검토

- Kakao Local API 카테고리만으로 보행 안전성을 완전히 보장할 수 없다.
- POI 검색이 추가되면 추천 응답 시간이 늘 수 있다.
- API 호출량이 늘어날 수 있으므로 검색 중심점, 반경, 후보 수 제한이 필요하다.
- `하천/산책로`는 Kakao 카테고리만으로 충분하지 않을 수 있어 키워드 검색 병행이 필요할 수 있다.
- `카페 근처`, `편의점 근처`는 방문 목적지가 아니라 밝고 익숙한 경로 분위기라는 문구가 중요하다.
- 향후에는 `피하고 싶은 장소`, `조용한 길`, `사람 많은 곳 피하기` 같은 회피 옵션을 별도 Step으로 검토한다.
