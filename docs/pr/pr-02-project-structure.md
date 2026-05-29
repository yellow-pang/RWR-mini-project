# PR #02 — Step 02: 프로젝트 기본 구조 구성

> 관련 Step 문서: [docs/steps/step-02-project-structure.md](../steps/step-02-project-structure.md)  
> 관련 작업계획서: [docs/plans/plan-02-project-structure.md](../plans/plan-02-project-structure.md)

---

## 브랜치 정보

| 항목        | 값                                                        |
| ----------- | --------------------------------------------------------- |
| 작업 브랜치 | `feature/step-02-project-structure`                       |
| 병합 대상   | `main`                                                    |
| PR 상태     | `[ ] 진행 중` / `[ ] 리뷰 요청` / `[ ] 병합 완료`        |

---

## GitHub PR 제목 (복사해서 사용)

```
[Step 02] 프로젝트 기본 구조 구성 — React Router, 레이아웃, 페이지 뼈대, UUID 유틸, API stub
```

---

## GitHub PR 본문 (복사해서 사용)

```markdown
## 개요

RWR 프로젝트 Step 02: 프로젝트 기본 구조 구성 완료

React Router DOM 설정, 공통 레이아웃(하단 탭바), 5개 페이지 뼈대,
익명 UUID 유틸, API 함수 stub 구조를 만들었습니다.
실제 API 연동은 Step 05에서 진행합니다.

## 주요 변경사항

- `client/vite.config.js` : `/api → localhost:3000` 프록시 추가 (Step 01 누락)
- `client/src/main.jsx` : BrowserRouter 래핑 추가
- `client/src/App.jsx` : Vite 기본 코드 제거, React Router Routes 구성
- `client/src/index.css` : RWR 디자인 변수(컬러·타이포) + 전역 리셋 + 공통 클래스
- `client/src/components/Layout.jsx` : Outlet + TabBar 공통 레이아웃
- `client/src/components/TabBar.jsx` : 홈·즐겨찾기·최근 3탭 하단 네비게이션
- `client/src/pages/` : 5개 페이지 뼈대 (Home, Result, Detail, Favorites, History)
- `client/src/utils/userId.js` : crypto.randomUUID() → localStorage.rwr_user_id
- `client/src/api/` : courses/favorites/history API 함수 stub (Step 05 구현 예정)
- `docs/plans/` : 작업계획서 폴더 신설, plan-01/plan-02 작성

## 라우팅 구조

| 경로 | 컴포넌트 |
|------|----------|
| `/` | HomePage |
| `/result` | ResultPage |
| `/courses/:id` | DetailPage |
| `/favorites` | FavoritesPage |
| `/history` | HistoryPage |

## 테스트 방법

1. `cd client && npm install && npm run dev`
2. `http://localhost:5173` — 홈 화면 확인
3. 하단 탭바 클릭 → 경로 전환 확인
4. DevTools → localStorage → `rwr_user_id` UUID 저장 확인

## 관련 문서

- Step 문서: `docs/steps/step-02-project-structure.md`
- 작업계획서: `docs/plans/plan-02-project-structure.md`
```

---

## 포함된 커밋 목록

> 커밋할 때마다 아래 표에 행을 추가하세요.  
> 커밋 메시지 규칙: `type(scope): 설명` — type: `feat` `fix` `chore` `docs` `refactor`

| #   | 커밋 해시 | 커밋 메시지                             | 변경 내용 요약             | 날짜 |
| --- | --------- | --------------------------------------- | -------------------------- | ---- |
| 1   |           | `feat(client): Step 02 프로젝트 기본 구조` | 라우팅·레이아웃·페이지 뼈대 |      |

---

## 변경 파일 체크리스트

### 수정

- [ ] `client/vite.config.js` — `/api` 프록시 설정 확인
- [ ] `client/src/main.jsx` — `<BrowserRouter>` 래핑 확인
- [ ] `client/src/App.jsx` — `<Routes>` 구성 확인 (Vite 기본 코드 제거)
- [ ] `client/src/index.css` — `--color-primary` 등 CSS 변수 존재 확인
- [ ] `client/src/App.css` — Vite 기본 스타일 제거 확인

### 신규 생성

- [ ] `client/src/components/Layout.jsx`
- [ ] `client/src/components/Layout.css`
- [ ] `client/src/components/TabBar.jsx`
- [ ] `client/src/components/TabBar.css`
- [ ] `client/src/pages/HomePage.jsx`
- [ ] `client/src/pages/ResultPage.jsx`
- [ ] `client/src/pages/DetailPage.jsx`
- [ ] `client/src/pages/FavoritesPage.jsx`
- [ ] `client/src/pages/HistoryPage.jsx`
- [ ] `client/src/utils/userId.js`
- [ ] `client/src/api/courses.js`
- [ ] `client/src/api/favorites.js`
- [ ] `client/src/api/history.js`
- [ ] `docs/plans/plan-01-dev-environment.md`
- [ ] `docs/plans/plan-02-project-structure.md`
- [ ] `docs/steps/step-02-project-structure.md`

### 제외 확인 (커밋에 포함되면 안 되는 파일)

- [ ] `server/.env`
- [ ] `client/.env.local`
- [ ] `node_modules/`

---

## 테스트 체크리스트

### 프론트엔드

- [ ] `npm run dev` 정상 실행 (port 5173)
- [ ] `http://localhost:5173` — 홈 화면 표시
- [ ] 탭바 홈 → 즐겨찾기 → 최근 전환 동작
- [ ] `/result`, `/favorites`, `/history` URL 직접 접근 가능
- [ ] `/nonexistent` → `/` 리다이렉트 확인
- [ ] DevTools Console 오류 없음
- [ ] DevTools localStorage → `rwr_user_id` UUID 저장 확인

### 빌드 (선택)

- [ ] `cd client && npm run build` 오류 없음

---

## 리뷰어에게

> 이 PR은 Step 02 프로젝트 기본 구조 단계입니다.  
> 페이지 컴포넌트는 뼈대만 있으며, 실제 UI는 Step 04에서 구현합니다.  
> API 함수는 stub 상태(throw new Error)이며, Step 05에서 실제 fetch로 교체합니다.  
> CSS는 기획서 컬러 시스템 변수만 정의된 상태입니다.

---

## 업데이트 이력

| 날짜       | 변경 내용         | 관련 커밋 |
| ---------- | ----------------- | --------- |
| 2026.05.29 | PR 문서 초안 작성 | —         |
