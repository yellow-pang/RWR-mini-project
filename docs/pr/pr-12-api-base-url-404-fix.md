# PR #12. API Base URL 404 오류 수정

> 관련 작업 계획서: [docs/plans/plan-12-api-base-url-404-fix.md](../plans/plan-12-api-base-url-404-fix.md)  
> 관련 Step 문서: [docs/steps/step-12-api-base-url-404-fix.md](../steps/step-12-api-base-url-404-fix.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `fix/api-base-url-404` 권장 |
| 병합 대상 | `dev` |
| 상태 | 진행 중 |

---

## PR 제목

```text
[Step 12] API Base URL 404 오류 수정
```

---

## 개요

UI 수정 후 코스 추천, 즐겨찾기, 이력 탭에서 API 요청이 404로 실패하는 문제를 수정했다.

서버 라우터는 `/api/courses`, `/api/favorites`, `/api/history` 기준으로 등록되어 있지만, 클라이언트 환경값이 `http://localhost:3000`처럼 `/api` 없이 설정되면 `http://localhost:3000/courses/random`으로 요청되어 `Route not found`가 발생했다.

---

## 주요 변경 사항

| 구분 | 내용 |
| --- | --- |
| API 클라이언트 | `buildUrl`에서 base URL의 trailing slash를 제거 |
| API 클라이언트 | base URL에 `/api`가 없으면 자동으로 `/api`를 붙이도록 정규화 |
| API 클라이언트 | path가 `/`로 시작하지 않아도 안전하게 조립되도록 보정 |
| 문서 | Step 12 계획, PR, 완료 문서 작성 |

---

## 변경 이유

`.env`는 사용자 확인 후 변경해야 하는 대상이다. 또한 환경값이 `/api`를 포함하든 포함하지 않든 클라이언트 API 유틸이 서버 명세에 맞는 경로를 만들어 주는 편이 안전하다.

이번 수정은 모든 API 모듈이 공통으로 사용하는 `client/src/api/client.js`에 한정했다. 따라서 코스 추천, 상세 조회, 즐겨찾기, 이력 요청이 같은 규칙으로 `/api` 경로를 사용한다.

---

## 검증

```powershell
cd client
npm.cmd run lint
npm.cmd run build
```

확인 결과:

```text
npm.cmd run lint  성공
npm.cmd run build 성공
```

---

## 제외 범위

| 제외 항목 | 사유 |
| --- | --- |
| `.env` 직접 변경 | 사용자 확인 대상이며 코드 보정으로 해결 |
| 서버 라우터 변경 | 서버와 문서 모두 `/api` 기준으로 일치 |
| DB 스키마/시드 변경 | 요청 경로 문제이므로 불필요 |
| GPS/공유/로그인/AI 추천 | MVP 외 기능 추가 금지 |
| 커밋/push/PR 생성 | 사용자가 직접 진행 |

---

## 확인 시나리오

1. 홈에서 거리, 시간, 운동 유형을 선택한다.
2. 추천 버튼 클릭 시 Network 요청이 `/api/courses/random?...`으로 나가는지 확인한다.
3. 즐겨찾기 탭 이동 시 `/api/favorites?userId=...` 요청이 나가는지 확인한다.
4. 이력 탭 이동 시 `/api/history?userId=...` 요청이 나가는지 확인한다.
5. 각 화면에서 `Route not found`가 더 이상 표시되지 않는지 확인한다.
