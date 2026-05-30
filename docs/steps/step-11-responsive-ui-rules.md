# Step 11. 반응형 UI 규칙 보정

> 작성일: 2026.05.31  
> 브랜치: `refactor/ui-refactor-like-wireframe`  
> 작업 계획서: [docs/plans/plan-11-responsive-ui-rules.md](../plans/plan-11-responsive-ui-rules.md)  
> 관련 PR 문서: [docs/pr/pr-11-responsive-ui-rules.md](../pr/pr-11-responsive-ui-rules.md)

---

## 1. 작업 목표

목업 이미지를 참고한 UI를 실제 웹/앱 화면 기준으로 정리한다.

이번 단계에서는 장치 프레임처럼 보이는 요소를 제거하고, 풀스택/PostgreSQL 기준 코드 작성 규칙에 맞춰 기능 없는 버튼과 CSS 규칙 위반 가능성을 줄이는 것을 목표로 했다.

---

## 2. 변경 내용

| 구분 | 파일 | 설명 |
| --- | --- | --- |
| 수정 | `client/src/components/Layout.jsx` | 목업용 상태바/노치 구조 제거 |
| 수정 | `client/src/components/Layout.css` | 모바일 전체 화면, PC 중앙 컨테이너 레이아웃 구성 |
| 수정 | `client/src/components/TabBar.jsx` | 아이콘 기반 탭바 구조 정리 |
| 수정 | `client/src/components/TabBar.css` | 실제 웹앱 하단 탭바 스타일로 보정 |
| 생성 | `client/src/components/Icon.jsx` | 의존성 추가 없이 사용하는 공통 SVG 아이콘 컴포넌트 |
| 생성 | `client/src/components/MapPreview.jsx` | 중립적인 코스 프리뷰 컴포넌트 |
| 생성 | `client/src/components/MapPreview.css` | 코스 프리뷰 스타일 |
| 수정 | `client/src/pages/HomePage.jsx` | 홈 헤더/조건 카드/CTA 스타일 정리, 기능 없는 아이콘 정적 요소화 |
| 수정 | `client/src/pages/ResultPage.jsx` | 추천 결과 화면 헤더와 결과 카드 스타일 정리 |
| 수정 | `client/src/pages/DetailPage.jsx` | 상세 화면 헤더, 프리뷰, 정보 섹션 구조 정리 |
| 수정 | `client/src/pages/FavoritesPage.jsx` | 헤더 아이콘을 비상호작용 요소로 정리 |
| 수정 | `client/src/pages/HistoryPage.jsx` | 헤더 아이콘을 비상호작용 요소로 정리 |
| 수정 | `client/src/components/CourseCard.jsx` | 결과 카드에 프리뷰와 아이콘 기반 액션 구성 |
| 수정 | `client/src/components/CourseCard.css` | 카드, 추천 이유, 액션 버튼 스타일 보정 |
| 수정 | `client/src/components/CourseInfo.jsx` | 상세 정보 섹션 아이콘 추가 |
| 수정 | `client/src/components/CourseInfo.css` | 상세 정보 섹션 스타일 보정 |
| 수정 | `client/src/index.css` | 전역 변수, 버튼, 조건 칩, 헤더 스타일 정리 |
| 생성 | `docs/plans/plan-11-responsive-ui-rules.md` | Step 11 작업 계획 |
| 생성 | `docs/pr/pr-11-responsive-ui-rules.md` | Step 11 PR 문서 |
| 생성 | `docs/steps/step-11-responsive-ui-rules.md` | Step 11 완료 문서 |

---

## 3. 주요 판단

### 요구사항 우선

홈 화면은 목업의 기본 선택 상태보다 요구사항을 우선했다. 따라서 조건 초기화 시 거리, 시간, 운동 유형이 모두 해제되고, 조건 3개가 모두 선택되기 전에는 추천 버튼이 비활성화된다.

### 기능 없는 버튼 처리

메뉴, 알림, 필터, 삭제는 향후 기능으로 확장할 수 있는 자리지만 현재 MVP에서는 동작하지 않는다. 따라서 `button`으로 노출하지 않고 `header-icon-static` 정적 요소로 표시했다.

### 지도 프리뷰 처리

실제 지도 API를 연결하지 않은 상태에서 특정 장소명을 고정 표시하면 실제 코스 위치처럼 오해될 수 있다. 따라서 `서울숲` 고정 라벨을 제거하고 중립적인 코스 프리뷰로 유지했다.

### CSS 규칙

컴포넌트 CSS에 흩어진 색상과 그림자 값은 `client/src/index.css`의 CSS Custom Properties로 이동해 풀스택/PostgreSQL 기준 private 규칙의 CSS 작성 원칙과 맞췄다.

---

## 4. 검증 결과

| 검증 항목 | 명령 | 결과 |
| --- | --- | --- |
| ESLint | `npm.cmd run lint` | 성공 |
| Production build | `npm.cmd run build` | 성공 |
| 변경 상태 확인 | `git status --short` | 의도한 클라이언트/UI 문서 변경 확인 |

---

## 5. 확인 방법

개발 서버 실행:

```powershell
cd client
npm.cmd run dev
```

브라우저 확인:

```text
http://localhost:5173/
```

확인 시나리오:

1. 홈 화면에서 조건 선택 전 추천 버튼이 비활성인지 확인한다.
2. 거리/시간/운동 유형 선택 후 추천 버튼이 활성화되는지 확인한다.
3. 초기화 클릭 시 선택 상태가 모두 해제되는지 확인한다.
4. 결과 화면과 상세 화면이 실제 웹앱 화면처럼 보이는지 확인한다.
5. 헤더의 장식 아이콘이 버튼처럼 동작하지 않는지 확인한다.

---

## 6. 다음 단계

- 실제 지도 API 또는 코스별 지도 데이터 연동은 별도 Step으로 분리한다.
- 메뉴/알림/필터/삭제 기능이 MVP 또는 후속 범위에 포함될 때 정적 아이콘을 실제 버튼으로 전환한다.
- 사용자 최종 확인 후 커밋과 push는 사용자가 직접 진행한다.

