# PR #04. React UI 구현

> 관련 Step 문서: [docs/steps/step-04-react-ui.md](../steps/step-04-react-ui.md)  
> 관련 작업 계획서: [docs/plans/plan-04-react-ui.md](../plans/plan-04-react-ui.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 기존 작업 브랜치 | `feat/step-04-react-ui` |
| 보정 브랜치 | `fix/step-04-ui-stabilization` |
| 병합 대상 | `main` |
| 상태 | 진행 중 |

---

## PR 제목

```text
[Step 04] React UI 구현 및 UI 안정화
```

---

## 개요

RWR 프로젝트 Step 04에서는 React 주요 화면과 공통 컴포넌트를 구현했다. 실제 API fetch는 Step 05 범위로 남기고, 이번 단계에서는 mock 데이터 기반으로 화면 흐름을 확인할 수 있도록 구성했다.

이번 보정 브랜치에서는 한글 인코딩 깨짐으로 인해 JSX가 닫히지 않던 파일을 복구하고, Step 05 연동 전에 프론트엔드가 빌드 가능한 형태를 유지하도록 안정화했다.

---

## 주요 변경 사항

| 구분 | 내용 |
| --- | --- |
| 상태 관리 | `CourseContext`에서 조건 선택값과 현재 추천 코스를 관리 |
| 홈 화면 | 거리, 시간, 이동 유형 선택 UI와 추천 이동 흐름 구현 |
| 결과 화면 | mock 추천 코스 카드, 조건 배지, 다시 추천 버튼 구현 |
| 상세 화면 | 코스 소개, 추천 이유, 주의사항, 이용 팁 섹션 구현 |
| 즐겨찾기 | API 연동 전 empty state 구현 |
| 최근 추천 | API 연동 전 empty state 구현 |
| 공통 컴포넌트 | `CourseCard`, `CourseInfo`, `EmptyState`, `Layout`, `TabBar` 정리 |
| 안정화 | 깨진 한글 문구와 JSX 문자열 복구 |
| 문서화 | DALL-E 목업과 실제 CSS 구현 차이를 후속 과제로 명시 |

---

## 라우팅 구조

| 경로 | 화면 | 설명 |
| --- | --- | --- |
| `/` | `HomePage` | 조건 선택 |
| `/result` | `ResultPage` | 추천 결과 |
| `/courses/:id` | `DetailPage` | 코스 상세 |
| `/favorites` | `FavoritesPage` | 즐겨찾기 |
| `/history` | `HistoryPage` | 최근 추천 |
| `*` | `Navigate` | 잘못된 경로는 홈으로 이동 |

---

## 변경 파일 체크리스트

| 파일 | 확인 항목 |
| --- | --- |
| `client/src/context/CourseContext.jsx` | mock 코스와 전역 상태가 정상 정의됨 |
| `client/src/pages/HomePage.jsx` | 조건 선택과 추천 이동이 동작함 |
| `client/src/pages/ResultPage.jsx` | 결과 카드와 다시 추천 버튼이 표시됨 |
| `client/src/pages/DetailPage.jsx` | 상세 정보 fallback이 동작함 |
| `client/src/pages/FavoritesPage.jsx` | empty state가 표시됨 |
| `client/src/pages/HistoryPage.jsx` | empty state가 표시됨 |
| `client/src/components/CourseCard.jsx` | 저장 토글과 상세 이동 버튼이 표시됨 |
| `client/src/components/CourseInfo.jsx` | 상세 4개 섹션이 표시됨 |
| `client/src/components/EmptyState.jsx` | 안내 문구와 홈 이동 버튼이 표시됨 |
| `client/src/components/Layout.jsx` | 헤더와 탭 구조가 유지됨 |
| `client/src/components/TabBar.jsx` | 탭 라벨과 접근성 라벨이 정상 표시됨 |
| `docs/steps/step-04-react-ui.md` | 구현 및 보정 내역이 문서화됨 |
| `docs/pr/pr-04-react-ui.md` | PR 설명과 검증 기준이 최신화됨 |

---

## 검증 방법

실행 위치: `C:\dev\RWR_project\client`

CMD:

```cmd
npm install
npm run build
npm run dev
```

PowerShell:

```powershell
npm install
npm run build
npm run dev
```

기대 결과:

- `npm run build`가 JSX 파싱 오류 없이 완료된다.
- 개발 서버에서 홈, 결과, 상세, 즐겨찾기, 최근 추천 화면에 접근할 수 있다.

---

## UI 검증 체크리스트

| 화면 | 검증 내용 |
| --- | --- |
| 홈 | 세 조건 선택 전 추천 버튼은 비활성화된다 |
| 홈 | 세 조건 선택 후 추천 버튼이 활성화된다 |
| 홈 | 초기화 버튼이 조건 선택을 해제한다 |
| 결과 | 선택 조건 배지와 코스 카드가 표시된다 |
| 결과 | 저장 버튼이 토글된다 |
| 결과 | 상세 보기 버튼이 상세 화면으로 이동한다 |
| 상세 | 코스 메타 정보와 상세 섹션 4개가 표시된다 |
| 즐겨찾기 | 저장된 항목이 없을 때 empty state가 표시된다 |
| 최근 | 추천 이력이 없을 때 empty state가 표시된다 |
| 공통 | 하단 탭으로 주요 화면을 이동할 수 있다 |

---

## 제외 범위

| 제외 항목 | 사유 |
| --- | --- |
| 실제 API fetch 구현 | Step 05 범위 |
| 즐겨찾기 DB 저장/삭제 | Step 05 범위 |
| 최근 추천 이력 DB 저장/조회 | Step 05 범위 |
| 로딩/오류 상태 UI | Step 05 API 연동과 함께 처리 |
| Docker 실행 검증 | 현재 작업 범위 및 환경 조건상 제외 |
| 커밋, push, PR 생성 | 사용자 직접 수행 |

---

## 목업-CSS 정합성 이슈

`docs/images/`의 DALL-E 목업은 시각 기준으로 참고하되, 현재 구현은 MVP 구조와 반응형 안정성을 우선한다. 아래 항목은 Step 05 이후 별도 UI 정합성 작업에서 다시 확인한다.

| 이슈 | 설명 | 권장 처리 |
| --- | --- | --- |
| 목업 색감과 실제 팔레트 차이 | 실제 CSS는 초록색 중심의 단순 팔레트 사용 | 디자인 시스템 색상 확정 후 일괄 정리 |
| 목업의 풍부한 시각 요소 미반영 | Step 04는 구조와 화면 흐름 우선 | 실제 화면 캡처 기반으로 보정 |
| 카드/버튼 반경 혼재 | 8px, 12px, 16px가 함께 사용됨 | 컴포넌트별 기준 재정의 |
| 아이콘 표현 불안정 | 깨진 특수문자 제거 후 텍스트 라벨로 보정 | 아이콘 라이브러리 도입 여부 결정 |

---

## 리뷰어 참고

- 이번 PR은 Step 04 UI 안정화가 목적이다.
- `MOCK_COURSE`와 빈 배열 기반 화면은 의도된 임시 구현이다.
- API 연동은 Step 05에서 `client/src/api/` 함수 구현과 함께 진행한다.
- 목업과 실제 CSS 차이는 알려진 이슈이며 문서에 후속 과제로 남겼다.
