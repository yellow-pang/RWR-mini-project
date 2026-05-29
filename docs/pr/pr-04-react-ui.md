# PR #04 — Step 04: React UI 구현

> 관련 Step 문서: [docs/steps/step-04-react-ui.md](../steps/step-04-react-ui.md)  
> 관련 작업계획서: [docs/plans/plan-04-react-ui.md](../plans/plan-04-react-ui.md)

---

## 브랜치 정보

| 항목        | 값                                                |
| ----------- | ------------------------------------------------- |
| 작업 브랜치 | `feat/step-04-react-ui`                           |
| 병합 대상   | `main`                                            |
| PR 상태     | `[ ] 진행 중` / `[ ] 리뷰 요청` / `[ ] 병합 완료` |

---

## GitHub PR 제목 (복사해서 사용)

```
[Step 04] React UI 구현 — 조건 선택, 추천 결과, 상세/빈 상태 화면 완성
```

---

## GitHub PR 본문 (복사해서 사용)

```markdown
## 개요

RWR 프로젝트 Step 04: React UI 구현 완료

Step 02에서 만든 React Router 기반 페이지 뼈대에 실제 화면 UI를 입히고,
조건 선택 → 추천 결과 → 상세 보기 → 즐겨찾기/최근 추천 빈 상태까지
목업 기준으로 동작하는 정적 프론트엔드 흐름을 구현했습니다.

실제 API fetch, 즐겨찾기 저장/삭제, 추천 이력 저장/조회는 Step 05에서 연결하며,
이번 단계에서는 `MOCK_COURSE`와 빈 배열 목 데이터를 사용합니다.

## 주요 변경사항

### 상태 관리 및 목 데이터

- `client/src/context/CourseContext.jsx` 신규 추가
- 홈에서 선택한 `conditions(distance, time, type)` 전역 관리
- 결과/상세 화면에서 공유할 `currentCourse` 전역 관리
- Step 05 API 연결 전까지 사용할 `MOCK_COURSE` 정의

### 공통 UI 컴포넌트

- `CourseCard` : 결과·즐겨찾기·최근 추천 화면 공용 코스 카드
- `CourseInfo` : 상세 화면의 코스 소개 / 추천 이유 / 주의사항 / 이용 팁 섹션
- `EmptyState` : 즐겨찾기·최근 추천 빈 상태 공용 컴포넌트
- `Layout` : AppHeader(녹색 그라디언트 브랜딩) + Outlet + TabBar 구조 보강

### 화면 구현

- `HomePage`
  - 거리(1/3/5km), 소요 시간(15/30/60분), 운동 유형(걷기/조깅/러닝) 칩 선택
  - 3개 조건 모두 선택 시 추천받기 버튼 활성화
  - 조건 선택 완료 시 초기화 버튼 노출
  - 추천받기 클릭 시 목 코스를 context에 저장하고 `/result` 이동

- `ResultPage`
  - 선택 조건 배지 표시
  - 추천 코스 `CourseCard` 렌더링
  - 즐겨찾기 토글 UI
  - 조건 변경 버튼으로 홈 복귀
  - 다시 추천 버튼은 Step 05 전까지 동일 목 코스 유지

- `DetailPage`
  - route state → context → 목 데이터 순서로 코스 데이터 폴백
  - 뒤로가기 버튼, 즐겨찾기 토글 버튼
  - 코스 메타 배지와 `CourseInfo` 4개 섹션 표시

- `FavoritesPage`
  - Step 05 전까지 빈 배열 목 데이터 사용
  - 저장된 항목이 없으면 EmptyState 표시
  - 코스 추천받기 버튼으로 홈 이동

- `HistoryPage`
  - Step 05 전까지 빈 배열 목 데이터 사용
  - 추천 이력이 없으면 EmptyState 표시
  - 이력 카드 렌더링 구조와 날짜 표시 옵션 준비

### 스타일

- `client/src/index.css`
  - 페이지 레이아웃, 조건 칩, 공통 버튼, 빈 상태, 조건 배지 스타일 추가
  - `placeholder-text` 임시 스타일 제거

- `client/src/components/CourseCard.css`
  - 코스 카드, 메타 배지, 추천 이유 박스, 상세 보기 버튼, 즐겨찾기 버튼 스타일

- `client/src/components/CourseInfo.css`
  - 상세 정보 섹션, 주의사항 강조 스타일

- `client/src/components/Layout.css`
  - AppHeader 녹색 그라디언트 배너 추가

- `client/src/components/TabBar.css`
  - 활성 탭 상단 녹색 인디케이터 추가

## 라우팅 구조

| 경로           | 화면             | 구현 내용                         |
| -------------- | ---------------- | --------------------------------- |
| `/`            | HomePage         | 조건 선택 + 추천받기              |
| `/result`      | ResultPage       | 추천 코스 카드 + 다시 추천        |
| `/courses/:id` | DetailPage       | 코스 상세 4개 섹션                |
| `/favorites`   | FavoritesPage    | 즐겨찾기 Empty State              |
| `/history`     | HistoryPage      | 최근 추천 Empty State             |
| `*`            | Navigate to `/`  | 잘못된 경로 홈 리다이렉트         |

## 테스트 방법

1. `cd client && npm install && npm run dev`
2. `http://localhost:5173` 접속
3. 홈에서 거리·시간·유형 칩을 모두 선택
4. 추천받기 버튼 활성화 및 초기화 버튼 노출 확인
5. 추천받기 클릭 → `/result` 이동 확인
6. 결과 화면에서 조건 배지, CourseCard, 즐겨찾기 토글, 다시 추천 버튼 확인
7. 상세 보기 클릭 → `/courses/route-001` 이동 및 상세 4개 섹션 확인
8. 하단 탭으로 즐겨찾기/최근 추천 이동 후 Empty State 확인

## 관련 문서

- Step 문서: `docs/steps/step-04-react-ui.md`
- 작업계획서: `docs/plans/plan-04-react-ui.md`
- 와이어프레임: `docs/05-ui-wireframe.md`
```

---

## 포함된 커밋 목록

> 커밋 메시지 규칙: `type(scope): 설명` — type: `feat` `fix` `chore` `docs` `refactor`

| #   | 커밋 해시 | 커밋 메시지                               | 변경 내용 요약                              | 날짜 |
| --- | --------- | ----------------------------------------- | ------------------------------------------- | ---- |
| 1   |           | `feat(client): Step 04 React UI 구현`     | 5개 페이지 UI, CourseContext, 공통 컴포넌트 |      |
| 2   |           | `style(client): 목업 기준 화면 스타일 적용` | AppHeader, TabBar, 카드, 칩, EmptyState CSS |      |
| 3   |           | `docs: Step 04 문서 작성`                 | plan/step/pr 문서 작성                      |      |

---

## 변경 파일 체크리스트

PR 전 아래 파일들이 정상 상태인지 확인하세요.

### 신규 생성

- [ ] `client/src/context/CourseContext.jsx` — 조건/현재 코스 context + `MOCK_COURSE`
- [ ] `client/src/components/CourseCard.jsx` — 공용 코스 카드
- [ ] `client/src/components/CourseCard.css` — 카드/즐겨찾기 버튼 스타일
- [ ] `client/src/components/CourseInfo.jsx` — 상세 정보 4개 섹션
- [ ] `client/src/components/CourseInfo.css` — 상세 섹션 스타일
- [ ] `client/src/components/EmptyState.jsx` — 빈 상태 컴포넌트
- [ ] `docs/plans/plan-04-react-ui.md`
- [ ] `docs/steps/step-04-react-ui.md`
- [ ] `docs/pr/pr-04-react-ui.md`

### 수정

- [ ] `client/src/App.jsx` — `CourseProvider` 래핑 + 중첩 라우트 확인
- [ ] `client/src/components/Layout.jsx` — AppHeader 구조 확인
- [ ] `client/src/components/Layout.css` — 녹색 그라디언트 AppHeader 확인
- [ ] `client/src/components/TabBar.css` — 활성 탭 인디케이터 확인
- [ ] `client/src/index.css` — 공통 버튼/칩/페이지/EmptyState 스타일 확인
- [ ] `client/src/pages/HomePage.jsx` — 조건 선택, 초기화, 추천 이동 확인
- [ ] `client/src/pages/ResultPage.jsx` — CourseCard 렌더링, 조건 변경, 다시 추천 확인
- [ ] `client/src/pages/DetailPage.jsx` — 상세 섹션, 즐겨찾기 토글 확인
- [ ] `client/src/pages/FavoritesPage.jsx` — EmptyState 및 홈 이동 확인
- [ ] `client/src/pages/HistoryPage.jsx` — EmptyState 및 홈 이동 확인

### 제외 확인

- [ ] 실제 API fetch 호출 없음 — Step 05에서 구현
- [ ] 즐겨찾기/이력 API 저장·삭제 호출 없음 — Step 05에서 구현
- [ ] `node_modules/` 커밋 제외
- [ ] `.env`, `.env.local` 커밋 제외

---

## 테스트 체크리스트

### 홈 화면

- [ ] 거리 칩 선택 상태가 표시된다
- [ ] 소요 시간 칩 선택 상태가 표시된다
- [ ] 운동 유형 칩 선택 상태가 표시된다
- [ ] 3개 조건 선택 전 추천받기 버튼이 비활성화된다
- [ ] 3개 조건 선택 후 추천받기 버튼이 활성화된다
- [ ] 3개 조건 선택 후 초기화 버튼이 표시된다
- [ ] 초기화 클릭 시 모든 선택이 해제된다
- [ ] 추천받기 클릭 시 `/result`로 이동한다

### 결과 화면

- [ ] 선택 조건 배지(distance/time/type)가 표시된다
- [ ] 목 코스 카드가 표시된다
- [ ] 즐겨찾기 버튼이 `♡` / `♥`로 토글된다
- [ ] 상세 보기 클릭 시 `/courses/route-001`로 이동한다
- [ ] 조건 변경 클릭 시 `/`로 이동한다
- [ ] 다시 추천 클릭 시 화면이 깨지지 않고 목 코스가 유지된다

### 상세 화면

- [ ] 뒤로가기 버튼이 동작한다
- [ ] 즐겨찾기 버튼이 토글된다
- [ ] 코스 제목과 거리/시간/유형/분위기 배지가 표시된다
- [ ] 코스 소개 섹션이 표시된다
- [ ] 추천 이유 섹션이 표시된다
- [ ] 주의사항 섹션이 강조 표시된다
- [ ] 이용 팁 섹션이 표시된다

### 즐겨찾기/최근 추천

- [ ] 즐겨찾기 빈 상태가 표시된다
- [ ] 즐겨찾기 EmptyState의 코스 추천받기 버튼이 홈으로 이동한다
- [ ] 최근 추천 빈 상태가 표시된다
- [ ] 최근 추천 EmptyState의 코스 추천받기 버튼이 홈으로 이동한다

### 공통 UI

- [ ] AppHeader에 RWR / Run Walk Random이 표시된다
- [ ] 하단 TabBar 홈/즐겨찾기/최근 탭 이동이 동작한다
- [ ] 활성 탭에 녹색 인디케이터가 표시된다
- [ ] 모바일 375px 기준에서 주요 텍스트와 버튼이 겹치지 않는다
- [ ] DevTools Console에 런타임 오류가 없다

### 빌드

- [ ] `cd client && npm run build` 오류 없음

---

## 리뷰어에게

> 이 PR은 Step 04 React UI 구현 단계입니다.  
> 실제 서버 API 호출은 아직 연결하지 않았고, `CourseContext.jsx`의 `MOCK_COURSE` 및 빈 배열 목 데이터로 화면 흐름을 확인합니다.  
> Step 05에서 courses / favorites / history API fetch, 로딩/에러 UI, 즐겨찾기·추천 이력 저장을 연결할 예정입니다.

---

## 업데이트 이력

| 날짜       | 변경 내용                                      | 관련 커밋 |
| ---------- | ---------------------------------------------- | --------- |
| 2026.05.29 | PR 문서 초안 작성                              | —         |
| 2026.05.29 | 현재 변경 사항 기준으로 본문/체크리스트 재작성 | —         |
