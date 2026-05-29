# PR #05. 프론트엔드-백엔드 연동

> 관련 Step 문서: [docs/steps/step-05-api-integration.md](../steps/step-05-api-integration.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `feat/step-05-api-integration` |
| 병합 대상 | `main` |
| 상태 | 진행 중 |

---

## PR 제목

```text
[Step 05] 프론트엔드-백엔드 API 연동
```

---

## 개요

Step 04에서 mock 데이터로 동작하던 React 화면을 Step 03 Express API와 연결했다. 추천, 상세 조회, 즐겨찾기, 최근 추천 이력을 실제 API 함수로 호출하며, 서버 또는 DB가 준비되지 않은 경우 화면에 오류 메시지를 표시한다.

---

## 주요 변경 사항

| 구분 | 내용 |
| --- | --- |
| API 공통 처리 | `api/client.js` 추가, base URL과 JSON 응답 처리 통일 |
| 코스 API | 랜덤 추천과 상세 조회 fetch 구현 |
| 즐겨찾기 API | 목록 조회, 추가, 삭제 fetch 구현 |
| 이력 API | 목록 조회, 추천 이력 저장 fetch 구현 |
| 홈 화면 | 추천 버튼 클릭 시 API 호출 및 추천 이력 저장 |
| 결과 화면 | 다시 추천, 즐겨찾기 상태 조회/토글 연결 |
| 상세 화면 | 직접 접근 시 상세 API 조회, 즐겨찾기 토글 연결 |
| 즐겨찾기 화면 | 사용자 UUID 기반 즐겨찾기 목록 조회/삭제 |
| 최근 화면 | 사용자 UUID 기반 최근 추천 이력 조회 |
| 오류 처리 | API 실패 시 `form-error` 메시지 표시 |

---

## 변경 파일 체크리스트

| 파일 | 확인 항목 |
| --- | --- |
| `client/src/api/client.js` | API base URL과 공통 오류 처리 |
| `client/src/api/courses.js` | `/courses/random`, `/courses/:id` 호출 |
| `client/src/api/favorites.js` | `/favorites` GET/POST/DELETE 호출 |
| `client/src/api/history.js` | `/history` GET/POST 호출 |
| `client/src/utils/userId.js` | `localStorage.rwr_user_id` 유지 |
| `client/src/utils/courseDisplay.js` | 서버 저장값과 화면 라벨 변환 |
| `client/src/pages/HomePage.jsx` | 추천 API 연동 |
| `client/src/pages/ResultPage.jsx` | 다시 추천/즐겨찾기 연동 |
| `client/src/pages/DetailPage.jsx` | 상세 조회/즐겨찾기 연동 |
| `client/src/pages/FavoritesPage.jsx` | 즐겨찾기 목록 연동 |
| `client/src/pages/HistoryPage.jsx` | 최근 추천 이력 연동 |
| `client/src/components/CourseCard.jsx` | 목록 응답 렌더링 보완 |
| `client/src/index.css` | 오류 메시지 스타일 |

---

## 검증 방법

실행 위치: `C:\dev\RWR_project\client`

CMD:

```cmd
npm run build
```

PowerShell:

```powershell
npm run build
```

확인 결과:

```text
vite build 성공
```

통합 실행 검증은 Express 서버와 PostgreSQL이 준비된 환경에서 진행한다.

---

## 제외 범위

| 제외 항목 | 사유 |
| --- | --- |
| 서버 API 구조 변경 | Step 03에서 구현 완료, 이번 단계는 프론트 연동 중심 |
| DB/seed 데이터 수정 | Step 06 또는 별도 데이터 정리 단계에서 처리 권장 |
| Docker 실행 검증 | 현재 환경에서 실행 실패 가능성이 있어 제외 |
| 커밋/push/PR 생성 | 사용자 직접 수행 |

---

## 리뷰어 참고

- 서버의 현재 `type` 검증값이 인코딩 깨진 문자열 기준이므로, 화면 라벨과 API 전송값을 분리했다.
- 추천 성공 후 이력 저장 실패는 추천 흐름을 막지 않도록 조용히 무시한다.
- 즐겨찾기/최근 목록 응답에는 상세 설명이 없을 수 있어 `CourseCard`가 선택 필드 없이도 렌더링되도록 보완했다.
- 실제 API 통합 검증은 PostgreSQL seed 데이터가 들어간 환경에서 수행해야 한다.
