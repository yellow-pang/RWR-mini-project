# Step 12. API Base URL 404 오류 수정

> 작성일: 2026.05.31  
> 브랜치: `fix/api-base-url-404` 권장  
> 작업 계획서: [docs/plans/plan-12-api-base-url-404-fix.md](../plans/plan-12-api-base-url-404-fix.md)  
> 관련 PR 문서: [docs/pr/pr-12-api-base-url-404-fix.md](../pr/pr-12-api-base-url-404-fix.md)

---

## 1. 작업 목표

UI 수정 후 코스 선택, 즐겨찾기 탭, 이력 탭에서 발생한 `Route not found` 오류를 해결한다.

실패 요청 예시는 다음과 같았다.

```text
GET http://localhost:3000/courses/random?distance=3&time=60&type=jogging
Status Code: 404 Not Found
```

---

## 2. 조사 결과

서버는 다음처럼 `/api` prefix 기준으로 라우터를 등록한다.

| 서버 라우터 | 실제 경로 |
| --- | --- |
| `app.use("/api/courses", coursesRouter)` | `/api/courses/random`, `/api/courses/:id` |
| `app.use("/api/favorites", favoritesRouter)` | `/api/favorites` |
| `app.use("/api/history", historyRouter)` | `/api/history` |

반면 클라이언트 환경값이 `http://localhost:3000`으로 설정된 상태에서 `buildUrl("/courses/random")`을 호출하면 `/api`가 빠진 URL이 만들어졌다.

---

## 3. 변경 내용

| 구분 | 파일 | 설명 |
| --- | --- | --- |
| 수정 | `client/src/api/client.js` | API base URL을 정규화해 `/api` 누락을 방지 |
| 생성 | `docs/plans/plan-12-api-base-url-404-fix.md` | Step 12 작업 계획과 완료 기준 기록 |
| 생성 | `docs/pr/pr-12-api-base-url-404-fix.md` | PR 설명 문서 |
| 생성 | `docs/steps/step-12-api-base-url-404-fix.md` | Step 12 완료 문서 |

---

## 4. 주요 판단

`.env`는 사용자 확인 후 변경해야 하는 대상이므로 이번 작업에서는 직접 수정하지 않았다.

대신 모든 API 모듈이 공통으로 사용하는 `buildUrl`에서 base URL을 정규화했다. 이로써 `VITE_API_BASE_URL`이 `http://localhost:3000`이어도 실제 요청은 `http://localhost:3000/api/...` 형식이 된다.

---

## 5. 검증 결과

| 검증 항목 | 명령 | 결과 |
| --- | --- | --- |
| ESLint | `npm.cmd run lint` | 성공 |
| Production build | `npm.cmd run build` | 성공 |

---

## 6. 확인 방법

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

1. 홈에서 거리, 시간, 운동 유형을 선택한다.
2. 추천 버튼 클릭 후 Network 요청이 `/api/courses/random?...`으로 나가는지 확인한다.
3. 즐겨찾기 탭에서 `/api/favorites?userId=...` 요청을 확인한다.
4. 이력 탭에서 `/api/history?userId=...` 요청을 확인한다.
5. `Route not found` 오류가 더 이상 표시되지 않는지 확인한다.

---

## 7. 다음 단계

- 실제 브라우저에서 API 서버와 클라이언트를 함께 실행해 화면 동작을 최종 확인한다.
- 커밋과 push는 사용자가 직접 진행한다.
