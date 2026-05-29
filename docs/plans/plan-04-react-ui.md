# 작업계획서 — Step 04: React 주요 화면 구현

> **상태**: 🔄 진행 중  
> **작성일**: 2026.05.29  
> **브랜치**: `feat/step-04-react-ui`  
> **관련 문서**: [05-ui-wireframe.md](../05-ui-wireframe.md)

---

## 1. 목표

Step 02에서 만든 5개 페이지 뼈대를 와이어프레임 기준에 맞게 완성한다.  
API 연동(fetch 호출)은 Step 05에서 하므로, 이번 단계는 **UI와 상태 관리**에 집중한다.  
조건 선택 → 결과 → 상세 → 즐겨찾기/이력 화면이 정적 목업 수준으로 동작해야 한다.

---

## 2. 작업 범위

### 수정할 파일

| 파일                                 | 수정 내용                                                  |
| ------------------------------------ | ---------------------------------------------------------- |
| `client/src/pages/HomePage.jsx`      | 조건 선택 칩 상태 관리, 추천 버튼 활성화, 초기화 버튼      |
| `client/src/pages/ResultPage.jsx`    | CourseCard 렌더링, 다시 추천/조건 변경 동작                |
| `client/src/pages/DetailPage.jsx`    | 코스 상세 정보 섹션 (설명/이유/주의/팁)                    |
| `client/src/pages/FavoritesPage.jsx` | 목록 렌더링 + 빈 상태 분기                                 |
| `client/src/pages/HistoryPage.jsx`   | 목록 렌더링 + 빈 상태 분기                                 |
| `client/src/index.css`               | CourseCard, CourseInfo, ConditionBadge 등 신규 스타일 추가 |

### 생성할 파일

| 파일                                   | 설명                                |
| -------------------------------------- | ----------------------------------- |
| `client/src/components/CourseCard.jsx` | 코스 카드 (결과·즐겨찾기·이력 공용) |
| `client/src/components/CourseCard.css` | CourseCard 스타일                   |
| `client/src/components/CourseInfo.jsx` | 코스 설명/이유/주의/팁 상세 섹션    |
| `client/src/components/EmptyState.jsx` | 빈 상태 공용 컴포넌트               |
| `client/src/context/CourseContext.jsx` | 선택 조건 + 현재 코스 전역 상태     |

### 제외 항목

| 제외 내용                        | 이유        |
| -------------------------------- | ----------- |
| 실제 API fetch 호출              | Step 05     |
| 즐겨찾기/이력 추가·삭제 API 연동 | Step 05     |
| 지도 표시 (카카오맵 등)          | MVP 범위 외 |

---

## 3. 상태 설계

### CourseContext (전역)

| 상태               | 타입                       | 설명                                          |
| ------------------ | -------------------------- | --------------------------------------------- |
| `conditions`       | `{ distance, time, type }` | 홈에서 선택한 조건 (결과·다시추천에서 재사용) |
| `currentCourse`    | `object \| null`           | 현재 추천받은 코스 (결과→상세 이동 시 유지)   |
| `setConditions`    | `function`                 | 조건 업데이트                                 |
| `setCurrentCourse` | `function`                 | 코스 업데이트                                 |

### 로컬 상태 (페이지별)

| 페이지          | 상태                       | 설명                             |
| --------------- | -------------------------- | -------------------------------- |
| `HomePage`      | `distance`, `time`, `type` | 선택된 칩 값                     |
| `FavoritesPage` | `favorites`                | 목 데이터 배열 (Step 05 전 목업) |
| `HistoryPage`   | `history`                  | 목 데이터 배열 (Step 05 전 목업) |

---

## 4. 화면 흐름

```
HomePage
  조건 3개 선택 완료
    → navigate('/result', { state: { conditions } })

ResultPage
  context.currentCourse 있으면 CourseCard 표시
  Step 05 전 → 목 코스 객체 직접 사용
  [조건 변경] → navigate('/')
  [다시 추천] → Step 05에서 API 연결 (현재는 동일 코스 유지)
  [상세 보기] → navigate('/courses/:id')

DetailPage
  context.currentCourse 또는 목 데이터로 CourseInfo 렌더
  헤더 우측 즐겨찾기 토글 버튼

FavoritesPage / HistoryPage
  목 데이터 배열 → CourseCard 리스트
  빈 배열 → EmptyState
```

---

## 5. 컴포넌트 명세

### CourseCard

| props              | 타입       | 설명                       |
| ------------------ | ---------- | -------------------------- |
| `course`           | `object`   | 코스 데이터                |
| `isFavorite`       | `boolean`  | 즐겨찾기 여부              |
| `onFavoriteToggle` | `function` | 즐겨찾기 토글 핸들러       |
| `onDetail`         | `function` | 상세 보기 핸들러           |
| `showDate`         | `boolean`  | 이력 화면용 날짜 표시 여부 |

### EmptyState

| props         | 타입       | 설명             |
| ------------- | ---------- | ---------------- |
| `icon`        | `string`   | 이모지 아이콘    |
| `title`       | `string`   | 제목 텍스트      |
| `description` | `string`   | 보조 설명        |
| `linkLabel`   | `string`   | 링크 버튼 텍스트 |
| `onLink`      | `function` | 링크 버튼 핸들러 |

### CourseInfo

| props    | 타입     | 설명                                         |
| -------- | -------- | -------------------------------------------- |
| `course` | `object` | 코스 데이터 (description/reason/caution/tip) |

---

## 6. 목 데이터 전략

Step 05 API 연동 전까지 `ResultPage`와 `DetailPage`는 하드코딩된 목 코스 1개를 사용한다.  
`FavoritesPage`와 `HistoryPage`는 빈 배열로 시작해 EmptyState를 확인한다.

```js
// 목 코스 (route-001 기준)
const MOCK_COURSE = {
  id: "route-001",
  title: "서울숲 둘레길",
  distance: 3,
  time: 30,
  type: "조깅",
  mood: "공원",
  description: "봄이면 벚꽃이 만개하는 서울숲 외곽 트랙 코스입니다.",
  reason: "평지 위주로 관절 부담이 적어 초보 조거에게 적합합니다.",
  caution: "주말 오전에는 이용객이 많아 혼잡합니다.",
  tip: "물 500ml 이상 준비를 권장합니다.",
};
```

---

## 7. CSS 추가 항목

기존 `index.css`에 없는 스타일:

| 클래스                 | 설명                                 |
| ---------------------- | ------------------------------------ |
| `.course-card`         | 코스 카드 컨테이너 (흰 카드, 그림자) |
| `.course-card-header`  | 코스명 + 즐겨찾기 버튼 행            |
| `.course-meta`         | 거리·시간·유형 칩 행                 |
| `.course-description`  | 짧은 설명 텍스트                     |
| `.course-reason`       | 추천 이유 강조 블록                  |
| `.course-info-section` | 상세 섹션 (설명/이유/주의/팁)        |
| `.course-info-danger`  | 주의사항 빨간 강조                   |
| `.favorite-btn`        | 즐겨찾기 토글 버튼 (❤️)              |
| `.condition-badge`     | 결과 화면 선택 조건 요약 칩          |
| `.history-date`        | 이력 화면 날짜 텍스트                |

---

## 8. 완료 기준

- [ ] 홈 화면: 3개 조건 모두 선택 시 추천 버튼 활성화, 초기화 동작
- [ ] 결과 화면: 목 코스 카드 렌더링, 조건 변경 버튼 홈으로 이동
- [ ] 상세 화면: 코스 4개 섹션(설명/이유/주의/팁) 표시, 즐겨찾기 토글 UI 동작
- [ ] 즐겨찾기 화면: 빈 상태 EmptyState 표시 + "홈으로" 링크 동작
- [ ] 이력 화면: 빈 상태 EmptyState 표시 + "홈으로" 링크 동작
- [ ] 모바일(375px) 기준 레이아웃 정상 표시
- [ ] `placeholder-text` 클래스 제거 (스텝 04 임시 CSS 정리)
