# 작업계획서 - Step 12: API Base URL 404 오류 수정

> **상태**: 진행 완료  
> **작성일**: 2026.05.31  
> **브랜치**: `fix/api-base-url-404` 권장  
> **목적**: UI 수정 후 코스 추천, 즐겨찾기, 이력 API가 `/api` 경로로 정상 호출되도록 복구
> **관련 문서**: [step-12-api-base-url-404-fix.md](../steps/step-12-api-base-url-404-fix.md) | [pr-12-api-base-url-404-fix.md](../pr/pr-12-api-base-url-404-fix.md)

---

## 1. 작업 배경

UI 수정 이후 코스를 선택하면 `Route not found`가 표시되고, 즐겨찾기와 이력 탭에서도 관련 오류가 발생한다.

개발자 도구 Network에서 확인된 실패 요청은 다음과 같다.

```text
GET http://localhost:3000/courses/random?distance=3&time=60&type=jogging
Status Code: 404 Not Found
```

서버는 `server/src/app.js`에서 `/api/courses`, `/api/favorites`, `/api/history` 경로로 라우터를 등록한다. 따라서 클라이언트 요청은 `/api/courses/random` 형식이어야 한다.

---

## 2. 요구사항 요약

- React + Vite 클라이언트는 `client/src/api/` 모듈을 통해서만 API를 호출한다.
- Express API 서버는 PostgreSQL 데이터를 기준으로 응답한다.
- 사용자 식별은 localStorage의 `rwr_user_id` 익명 UUID를 사용한다.
- 정적 `routeData.js`나 localStorage 배열 기준으로 회귀하지 않는다.
- `schema.sql`, `seed.sql`, Docker 설정, `.env` 변경은 사용자 확인 후 진행한다.
- MVP 외 기능인 GPS, 공유, 로그인, AI 추천은 추가하지 않는다.

---

## 3. 원인 가설

`client/.env`의 `VITE_API_BASE_URL`이 `http://localhost:3000`으로 설정되어 있으면, `buildUrl("/courses/random")` 결과가 `/api` 없이 `http://localhost:3000/courses/random`이 된다.

이번 작업에서는 `.env` 파일을 바로 수정하지 않고, 클라이언트 API 유틸에서 base URL을 안전하게 정규화해 `/api` 누락으로 인한 404를 방지한다.

---

## 4. 수정 계획

| 순서 | 작업 | 내용 |
| --- | --- | --- |
| 1 | API URL 조립 확인 | `client/src/api/client.js`의 `API_BASE_URL`, `buildUrl` 동작 확인 |
| 2 | 경로 정규화 추가 | base URL이 `/api` 없이 들어와도 API 요청 경로가 `/api/...`가 되도록 보정 |
| 3 | 영향 범위 확인 | 코스 추천, 상세, 즐겨찾기, 이력 API 모듈이 모두 같은 유틸을 쓰는지 확인 |
| 4 | 검증 | lint/build 실행, 가능하면 URL 조립 로직 단위 확인 |
| 5 | 문서화 | PR/Step 문서 작성 |

---

## 5. 제외 범위

| 제외 항목 | 사유 |
| --- | --- |
| `.env` 직접 변경 | 사용자 확인 대상이며 코드 보정으로 해결 가능 |
| 서버 라우터 경로 변경 | 문서와 서버 구조가 `/api` 기준으로 일치함 |
| DB 스키마/시드 변경 | 이번 오류는 요청 경로 문제로 판단됨 |
| 즐겨찾기/이력 저장 방식 변경 | PostgreSQL + 익명 UUID 기준을 유지 |
| 커밋/push | 사용자 직접 진행 |

---

## 6. 검증 계획

| 검증 항목 | 방법 | 기대 결과 |
| --- | --- | --- |
| URL 조립 | `VITE_API_BASE_URL=http://localhost:3000` 상황 확인 | `/api/courses/random` 경로로 요청 |
| 정적 검사 | `npm.cmd run lint` | ESLint 오류 없음 |
| 빌드 | `npm.cmd run build` | Vite production build 성공 |
| 변경 상태 | `git status --short` | 의도한 코드/문서 변경만 존재 |

---

## 7. 완료 기준

- [x] `/courses/random`이 아니라 `/api/courses/random`으로 요청된다.
- [x] 즐겨찾기와 이력 탭 요청도 `/api/favorites`, `/api/history`로 요청된다.
- [x] 컴포넌트 직접 fetch 호출 없이 `client/src/api/` 경유 구조를 유지한다.
- [x] lint/build가 성공한다.
- [x] PR/Step 문서가 작성된다.
