# Step 04. React UI 구현

> 작성일: 2025.01.28 | 단계: Step 04 / 8  
> PR 문서: [docs/pr/pr-04-react-ui.md](../pr/pr-04-react-ui.md)

---

## 1. 작업 목표

| #   | 목표                         | 완료 기준                                                     |
| --- | ---------------------------- | ------------------------------------------------------------- |
| 1   | 앱 공통 레이아웃 구성        | AppHeader(녹색 그라디언트 배너) + 페이지 콘텐츠 + TabBar 구조 |
| 2   | 홈 페이지 (조건 선택)        | 거리·시간·유형 칩 선택 → 추천받기 활성화 / 초기화 텍스트링크  |
| 3   | 결과 페이지 (추천 코스 표시) | ← 조건 변경 버튼 + CourseCard + 🔄 다시 추천 풀너비 버튼      |
| 4   | 상세 페이지 (코스 상세 정보) | 뒤로가기 + 즐겨찾기 버튼 + 코스 메타 + 4개 섹션(CourseInfo)   |
| 5   | 즐겨찾기 페이지              | 저장된 항목 카드 목록 또는 Empty State 표시                   |
| 6   | 이력 페이지                  | 추천 이력 카드 목록 또는 Empty State 표시                     |
| 7   | 디자인 목업 반영             | docs/images 목업과 레이아웃·색상·컴포넌트 일치                |

---

## 2. 작업 배경

Step 03에서 Express API 라우터 구현이 완료되었습니다.  
이번 단계에서는 React + CSS로 프론트엔드 UI를 구현하고, 목업 이미지(docs/images/)와 최대한 일치하는 화면을 만듭니다.  
실제 API 연결은 Step 05에서 처리하므로, 이번 단계는 mock 데이터를 사용합니다.

---

## 3. 아키텍처 개요

### 3.1 라우팅 구조

```
BrowserRouter
└── CourseProvider (Context)
    └── Layout (AppHeader + Outlet + TabBar)
        ├── /              → HomePage
        ├── /result        → ResultPage
        ├── /courses/:id   → DetailPage
        ├── /favorites     → FavoritesPage
        └── /history       → HistoryPage
```

### 3.2 상태 관리

```
CourseContext
├── conditions  { distance, time, type }  ← 홈 조건 선택 상태
└── currentCourse  Object | null          ← 추천된 코스 (결과·상세 공유)
```

### 3.3 컴포넌트 트리

```
Layout
├── AppHeader          ← 녹색 그라디언트 브랜딩 헤더
├── <Outlet>           ← 페이지 콘텐츠 영역
│   ├── HomePage
│   │   └── 조건 칩 (거리 4개 / 시간 4개 / 유형 4개)
│   ├── ResultPage
│   │   └── CourseCard
│   ├── DetailPage
│   │   └── CourseInfo
│   ├── FavoritesPage
│   │   ├── CourseCard (목록)
│   │   └── EmptyState
│   └── HistoryPage
│       ├── CourseCard (목록)
│       └── EmptyState
└── TabBar             ← 홈 / 즐겨찾기 / 최근
```

---

## 4. 디자인 시스템

### 4.1 CSS 변수

```css
--color-primary: #4caf50 /* 메인 녹색 */ --color-primary-dark: #388e3c
  /* 진한 녹색 (그라디언트 끝) */ --color-card: #ffffff /* 카드 배경 */
  --color-bg: #f5f5f5 /* 페이지 배경 */ --color-border: #e0e0e0 /* 경계선 */
  --color-text-main: #212121 /* 본문 텍스트 */ --color-text-sub: #757575
  /* 보조 텍스트 */ --color-danger: #e53935 /* 삭제·경고 */;
```

### 4.2 주요 버튼 스타일

| 클래스          | 용도                               | 외형                             |
| --------------- | ---------------------------------- | -------------------------------- |
| `.btn-primary`  | 추천받기, 다시 추천, 코스 추천받기 | 녹색 채움, 비활성 시 opacity 0.4 |
| `.btn-back`     | ← 조건 변경, ← 뒤로                | 배경 없음, 회색 텍스트           |
| `.btn-reset`    | 초기화                             | 텍스트 링크 스타일 (밑줄)        |
| `.favorite-btn` | ♡ / ♥ 즐겨찾기 토글                | 원형, 비활성 회색 / 활성 빨간색  |

---

## 5. 생성/수정 파일 목록

### 5.1 신규 생성

| 파일                                   | 설명                                 |
| -------------------------------------- | ------------------------------------ |
| `client/src/context/CourseContext.jsx` | 전역 조건·코스 상태 Context          |
| `client/src/components/Layout.jsx`     | AppHeader + Outlet + TabBar 레이아웃 |
| `client/src/components/Layout.css`     | 레이아웃 + AppHeader 스타일          |
| `client/src/components/TabBar.jsx`     | 하단 탭 네비게이션 (NavLink 3개)     |
| `client/src/components/TabBar.css`     | 탭바 스타일 + 활성 인디케이터 라인   |
| `client/src/components/CourseCard.jsx` | 코스 정보 카드 컴포넌트              |
| `client/src/components/CourseCard.css` | 카드 스타일 + 즐겨찾기 버튼          |
| `client/src/components/CourseInfo.jsx` | 코스 상세 4개 섹션 컴포넌트          |
| `client/src/components/CourseInfo.css` | 섹션 카드 스타일                     |
| `client/src/components/EmptyState.jsx` | 빈 목록 상태 컴포넌트                |
| `client/src/pages/HomePage.jsx`        | 조건 선택 페이지                     |
| `client/src/pages/ResultPage.jsx`      | 추천 결과 페이지                     |
| `client/src/pages/DetailPage.jsx`      | 코스 상세 페이지                     |
| `client/src/pages/FavoritesPage.jsx`   | 즐겨찾기 목록 페이지                 |
| `client/src/pages/HistoryPage.jsx`     | 추천 이력 페이지                     |

### 5.2 수정

| 파일                   | 주요 변경 내용                                    |
| ---------------------- | ------------------------------------------------- |
| `client/src/App.jsx`   | BrowserRouter + Routes 설정, Layout 중첩 라우트   |
| `client/src/index.css` | CSS 변수, 버튼 공통 스타일, 페이지·카드·칩 스타일 |

---

## 6. 주요 구현 내용

### 6.1 AppHeader

```jsx
<header className="app-header">
  <span className="app-header-logo">🏃</span>
  <div className="app-header-title-wrap">
    <span className="app-header-title">RWR</span>
    <span className="app-header-sub">Run Walk Random</span>
  </div>
</header>
```

- `linear-gradient(135deg, #4CAF50 → #388E3C)` 녹색 그라디언트
- 흰색 텍스트, 하단 고정 없이 레이아웃 상단에 배치

### 6.2 HomePage 조건 선택

```jsx
// 3개 조건 모두 선택 여부 확인
const allSelected = conditions.distance && conditions.time && conditions.type;

// 칩 클릭 → Context 업데이트
function handleChipSelect(field, value) {
  setConditions((prev) => ({ ...prev, [field]: value }));
}
```

- 선택된 칩: `background-color: var(--color-primary)`, 흰색 텍스트
- 비활성 추천받기 버튼: `opacity: 0.4` (초록색 유지)
- 초기화 버튼: 3개 선택 시만 조건부 렌더, 텍스트 링크 스타일

### 6.3 TabBar 활성 인디케이터

```css
.tab-item.active::after {
  content: "";
  position: absolute;
  top: 0;
  left: 25%;
  right: 25%;
  height: 3px;
  background-color: var(--color-primary);
  border-radius: 0 0 3px 3px;
}
```

### 6.4 즐겨찾기 버튼

- 비활성: `♡` (serif 하트), 회색 테두리/배경
- 활성: `♥` (serif 하트), 빨간 테두리/배경(`#fff0f0`)

---

## 7. 화면별 검증 결과

| 페이지        | 검증 항목                                             | 결과 |
| ------------- | ----------------------------------------------------- | ---- |
| HomePage      | 칩 선택, 추천받기 활성화, 초기화 텍스트링크           | ✅   |
| HomePage      | 비활성 추천받기 faded green (opacity 0.4)             | ✅   |
| ResultPage    | ← 조건 변경 뒤로가기, 코스 카드, 🔄 다시 추천 버튼    | ✅   |
| ResultPage    | 즐겨찾기 ♡ → ♥ 토글 (회색 → 빨간색)                   | ✅   |
| DetailPage    | ← 뒤로 + ♡ 버튼, 코스 제목/배지, CourseInfo 4섹션     | ✅   |
| FavoritesPage | Empty State (♡ 아이콘 + 텍스트 + 코스 추천받기 버튼)  | ✅   |
| HistoryPage   | Empty State (🏃 아이콘 + 텍스트 + 코스 추천받기 버튼) | ✅   |
| TabBar        | 활성 탭 상단 녹색 인디케이터 라인                     | ✅   |

---

## 8. 다음 단계

Step 05에서 처리할 내용:

- Express API 연결 (`/api/courses/recommend` 실제 호출)
- 즐겨찾기 저장/삭제 API 연결
- 이력 조회 API 연결
- 로딩 스피너, 에러 처리 UI
