# 작업계획서 — Step 02: 프로젝트 기본 구조 구성

> **상태**: 🔄 진행 중  
> **작성일**: 2026.05.29  
> **브랜치**: `feature/step-02-project-structure`  
> **관련 문서**: [step-02-project-structure.md](../steps/step-02-project-structure.md) | [pr-02-project-structure.md](../pr/pr-02-project-structure.md)

---

## 1. 목표

React Router DOM 설정, 공통 레이아웃(하단 탭바), 5개 페이지 뼈대,
익명 UUID 유틸, API 함수 구조를 만든다.  
실제 API 연동 없이 **구조만** 완성하는 단계.

---

## 2. 작업 범위

### 수정할 파일

| 파일 | 수정 내용 | 이유 |
|------|-----------|------|
| `client/vite.config.js` | `/api` 프록시 설정 추가 | Step 01에서 누락됨 |
| `client/src/main.jsx` | `<BrowserRouter>` 래핑 추가 | React Router 동작 전제 |
| `client/src/App.jsx` | Vite 기본 코드 제거, `<Routes>` 구성 | 라우팅 진입점 역할 |
| `client/src/index.css` | Vite 기본 CSS 제거, RWR 디자인 변수 + 전역 리셋 | 기획서 컬러 시스템 적용 |
| `client/src/App.css` | Vite 기본 CSS 전체 제거 | 기본 코드 잔존 방지 |

### 생성할 파일

| 파일 | 설명 |
|------|------|
| `client/src/components/Layout.jsx` | `<Outlet>` + `<TabBar>` 감싸는 공통 레이아웃 |
| `client/src/components/Layout.css` | 레이아웃 기본 스타일 |
| `client/src/components/TabBar.jsx` | 홈·즐겨찾기·최근 3탭 하단 네비게이션 |
| `client/src/components/TabBar.css` | 탭바 스타일 |
| `client/src/pages/HomePage.jsx` | 조건 선택 화면 뼈대 |
| `client/src/pages/ResultPage.jsx` | 추천 결과 화면 뼈대 |
| `client/src/pages/DetailPage.jsx` | 코스 상세 화면 뼈대 |
| `client/src/pages/FavoritesPage.jsx` | 즐겨찾기 목록 화면 뼈대 |
| `client/src/pages/HistoryPage.jsx` | 최근 추천 이력 화면 뼈대 |
| `client/src/utils/userId.js` | `crypto.randomUUID()` → `localStorage.rwr_user_id` |
| `client/src/api/courses.js` | 코스 API 함수 stub |
| `client/src/api/favorites.js` | 즐겨찾기 API 함수 stub |
| `client/src/api/history.js` | 이력 API 함수 stub |
| `docs/steps/step-02-project-structure.md` | Step 02 기술 문서 |
| `docs/pr/pr-02-project-structure.md` | PR 02 문서 |

### 제외 항목

| 제외 내용 | 이유 |
|-----------|------|
| 실제 fetch 호출 구현 | Step 05 (프론트-백 연동 단계) |
| Express API 라우터 구현 | Step 03 |
| CSS 상세 디자인 | Step 04 (화면 구현 단계)에서 함께 |
| 카카오맵 연동 | Step 04 |
| DB 쿼리 구현 | Step 03 |
| Docker 실행 | Step 07 이후 |
| 커밋·브랜치·push·PR | 사용자 직접 진행 |

---

## 3. 의사결정 근거

| 결정 사항 | 선택 | 이유 |
|-----------|------|------|
| 라우터 구조 | Nested Route (`Layout` 공통) | 탭바가 모든 페이지에 공통 적용 |
| `ResultPage` 경로 | `/result` | 조건 선택 후 결과 전환, URL 직접 접근 방지는 Step 05에서 처리 |
| `DetailPage` 경로 | `/courses/:id` | REST 규칙 준수, id로 API 호출 예정 |
| API stub 반환값 | `throw new Error('Not implemented')` | 미구현 함수 호출 시 즉시 오류 확인 가능 |
| UUID 저장 키 | `rwr_user_id` | 기획서 `06-data-spec.md` 명세와 일치 |
| CSS 방식 | 컴포넌트별 CSS 파일 | 순수 CSS 전략 유지, 범위 충돌 방지 |

---

## 4. 라우팅 구조

```
/              → HomePage   (홈·조건 선택)
/result        → ResultPage (추천 결과)
/courses/:id   → DetailPage (코스 상세)
/favorites     → FavoritesPage (즐겨찾기)
/history       → HistoryPage (최근 추천)
*              → /로 리다이렉트
```

---

## 5. 위험 요소 및 대응

| 위험 요소 | 대응 방안 |
|-----------|-----------|
| React Router v7 API 변경 | `package.json`에 `react-router-dom ^7.x` 확인됨, `createBrowserRouter` 대신 `BrowserRouter` 방식 사용 |
| Vite proxy 미설정 | `vite.config.js`에 `/api → localhost:3000` 추가 |
| UUID 미지원 브라우저 | `crypto.randomUUID()`는 HTTPS 또는 localhost에서만 동작 — 개발 환경 해당 없음 |

---

## 6. 완료 기준

- [ ] `npm run dev` 실행 시 5개 경로 모두 접근 가능
- [ ] 하단 탭바 3개 탭 클릭 시 경로 전환 확인
- [ ] `getUserId()` 호출 시 localStorage에 UUID 저장 확인
- [ ] API stub 파일 import 시 오류 없음
- [ ] 콘솔에 React 경고 없음
