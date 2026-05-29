# PR #03 — Step 03: Express API 라우터 구현

> 관련 Step 문서: [docs/steps/step-03-express-api.md](../steps/step-03-express-api.md)  
> 관련 작업계획서: [docs/plans/plan-03-express-api.md](../plans/plan-03-express-api.md)

---

## 브랜치 정보

| 항목        | 값                                                |
| ----------- | ------------------------------------------------- |
| 작업 브랜치 | `feat/step-03-express-api`                        |
| 병합 대상   | `main`                                            |
| PR 상태     | `[ ] 진행 중` / `[ ] 리뷰 요청` / `[ ] 병합 완료` |

---

## GitHub PR 제목 (복사해서 사용)

```
[Step 03] Express API 라우터 구현 — courses/favorites/history, 3계층 구조, express-validator
```

---

## GitHub PR 본문 (복사해서 사용)

```markdown
## 개요

RWR 프로젝트 Step 03: Express API 라우터 구현 완료

courses / favorites / history REST API를 라우터 → 컨트롤러 → 서비스 3계층으로 구현합니다.
express-validator 입력 검증과 DB 에러(중복 즐겨찾기 등) 처리를 포함합니다.

## 주요 변경사항

- `server/src/app.js` : 라우터 등록 활성화
- `server/src/routes/` : courses / favorites / history 라우터 + 검증 미들웨어
- `server/src/controllers/` : 3개 컨트롤러 (요청 파싱·응답 조립)
- `server/src/services/` : 3개 서비스 (DB 쿼리 로직)
- `docs/plans/plan-03-express-api.md` : Step 03 작업계획서

## 구현된 엔드포인트

| 메서드 | 경로                       | 설명           |
| ------ | -------------------------- | -------------- |
| GET    | `/api/courses/random`      | 랜덤 코스 추천 |
| GET    | `/api/courses/:id`         | 코스 상세      |
| GET    | `/api/favorites`           | 즐겨찾기 목록  |
| POST   | `/api/favorites`           | 즐겨찾기 추가  |
| DELETE | `/api/favorites/:courseId` | 즐겨찾기 삭제  |
| GET    | `/api/history`             | 추천 이력 조회 |
| POST   | `/api/history`             | 추천 이력 저장 |

## 테스트 방법

1. `cd server && npm install && npm run dev`
2. `GET http://localhost:3000/api/health` 응답 확인
3. `GET http://localhost:3000/api/courses/random?distance=99` → 400 응답 확인

> ⚠️ DB 없이 실행 시 서버 기동은 되나 DB 쿼리 호출 시 연결 오류 발생 (정상)

## 관련 문서

- Step 문서: `docs/steps/step-03-express-api.md`
- 작업계획서: `docs/plans/plan-03-express-api.md`
```

---

## 포함된 커밋 목록

| #   | 커밋 해시 | 커밋 메시지                                     | 변경 내용 요약                   | 날짜 |
| --- | --------- | ----------------------------------------------- | -------------------------------- | ---- |
| 1   |           | `feat(server): Step 03 Express API 라우터 구현` | routes/controllers/services 전체 |      |

---

## 변경 파일 체크리스트

### 수정

- [ ] `server/src/app.js` — 라우터 3개 등록 확인

### 신규 생성

- [ ] `server/src/routes/courses.js`
- [ ] `server/src/routes/favorites.js`
- [ ] `server/src/routes/history.js`
- [ ] `server/src/controllers/coursesController.js`
- [ ] `server/src/controllers/favoritesController.js`
- [ ] `server/src/controllers/historyController.js`
- [ ] `server/src/services/coursesService.js`
- [ ] `server/src/services/favoritesService.js`
- [ ] `server/src/services/historyService.js`
- [ ] `docs/plans/plan-03-express-api.md`
- [ ] `docs/steps/step-03-express-api.md`

### 제외 확인

- [ ] `server/.env` — `.gitignore`에 포함됨
- [ ] `node_modules/` — `.gitignore`에 포함됨

---

## 테스트 체크리스트

### 서버 기동

- [ ] `npm run dev` 정상 실행 (port 3000)
- [ ] `GET /api/health` → `{"success":true}` 유지

### 입력 검증

- [ ] `GET /api/courses/random?distance=99` → 400
- [ ] `GET /api/courses/random?distance=3&time=30` (type 누락) → 400
- [ ] `POST /api/favorites` body 없음 → 400
- [ ] `GET /api/favorites` (userId 없음) → 400

### 라우팅

- [ ] 등록된 경로 → 200 또는 DB 오류 (500)
- [ ] 존재하지 않는 경로 → 404 (기존 핸들러 유지)

---

## 리뷰어에게

> 이 PR은 Step 03 API 라우터 구현 단계입니다.  
> DB(PostgreSQL)가 실행되지 않은 환경에서는 서버 기동 후 DB 쿼리 호출 시 연결 오류가 발생합니다. 이는 정상입니다.  
> 프론트엔드 연동(실제 fetch 호출)은 Step 05에서 진행합니다.

---

## 업데이트 이력

| 날짜       | 변경 내용         | 관련 커밋 |
| ---------- | ----------------- | --------- |
| 2026.05.29 | PR 문서 초안 작성 | —         |
