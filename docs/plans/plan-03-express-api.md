# 작업계획서 — Step 03: Express API 라우터 구현

> **상태**: 🔄 진행 중  
> **작성일**: 2026.05.29  
> **브랜치**: `feat/step-03-express-api`  
> **관련 문서**: [step-03-express-api.md](../steps/step-03-express-api.md) | [pr-03-express-api.md](../pr/pr-03-express-api.md)

---

## 1. 목표

courses / favorites / history API 엔드포인트를 구현한다.  
라우터 → 컨트롤러 → 서비스 3계층으로 분리하고,  
express-validator 입력 검증과 에러 처리 미들웨어를 적용한다.  
DB 연결 없이도 구조가 동작하도록 **서비스 계층에서 DB 쿼리를 분리**한다.

---

## 2. 작업 범위

### 수정할 파일

| 파일                | 수정 내용                                      | 이유                           |
| ------------------- | ---------------------------------------------- | ------------------------------ |
| `server/src/app.js` | 라우터 등록 주석 해제 + 실제 require 경로 적용 | Step 01에서 TODO로 남겨둔 부분 |

### 생성할 파일

| 파일                                            | 설명                                  |
| ----------------------------------------------- | ------------------------------------- |
| `server/src/routes/courses.js`                  | 코스 라우터 (`/api/courses`)          |
| `server/src/routes/favorites.js`                | 즐겨찾기 라우터 (`/api/favorites`)    |
| `server/src/routes/history.js`                  | 이력 라우터 (`/api/history`)          |
| `server/src/controllers/coursesController.js`   | 코스 컨트롤러 (요청 파싱 + 응답 조립) |
| `server/src/controllers/favoritesController.js` | 즐겨찾기 컨트롤러                     |
| `server/src/controllers/historyController.js`   | 이력 컨트롤러                         |
| `server/src/services/coursesService.js`         | 코스 DB 쿼리 (랜덤 추천, 상세 조회)   |
| `server/src/services/favoritesService.js`       | 즐겨찾기 DB 쿼리 (조회·추가·삭제)     |
| `server/src/services/historyService.js`         | 이력 DB 쿼리 (조회·저장)              |
| `docs/plans/plan-03-express-api.md`             | 이 파일                               |
| `docs/steps/step-03-express-api.md`             | Step 03 기술 문서                     |
| `docs/pr/pr-03-express-api.md`                  | PR 03 문서                            |

### 제외 항목

| 제외 내용                    | 이유                                    |
| ---------------------------- | --------------------------------------- |
| 실제 DB 연결 실행            | Docker + PostgreSQL 환경 필요 (Step 07) |
| 프론트엔드 연동 (fetch 구현) | Step 05                                 |
| 카카오맵 API                 | Step 04                                 |
| 인증 미들웨어                | MVP 범위 외                             |
| 커밋·브랜치·push·PR          | 사용자 직접 진행                        |

---

## 3. 구현할 엔드포인트

| 메서드   | 경로                       | 설명                        |
| -------- | -------------------------- | --------------------------- |
| `GET`    | `/api/courses/random`      | 조건 필터 + 랜덤 코스 1개   |
| `GET`    | `/api/courses/:id`         | 코스 상세 조회              |
| `GET`    | `/api/favorites`           | 즐겨찾기 목록 (userId 필수) |
| `POST`   | `/api/favorites`           | 즐겨찾기 추가               |
| `DELETE` | `/api/favorites/:courseId` | 즐겨찾기 삭제               |
| `GET`    | `/api/history`             | 추천 이력 조회 (limit=10)   |
| `POST`   | `/api/history`             | 추천 이력 저장              |

> `GET /api/courses` (목록 조회)는 기획서에 명세는 있으나 MVP UI에서 사용하지 않으므로 **이번 단계 제외**

---

## 4. 계층 구조 설계

```
요청 (HTTP)
  ↓
routes/       ← 경로 + 검증 미들웨어 등록
  ↓
controllers/  ← 요청 파싱, 서비스 호출, 응답 조립
  ↓
services/     ← DB 쿼리 (pg pool 사용)
  ↓
db/index.js   ← pg Pool query 헬퍼
```

---

## 5. 입력 검증 규칙 (express-validator)

### GET /api/courses/random

| 파라미터   | 타입    | 필수 | 검증                           |
| ---------- | ------- | ---- | ------------------------------ |
| `distance` | integer | ✅   | `1`, `3`, `5` 중 하나          |
| `time`     | integer | ✅   | `15`, `30`, `60` 중 하나       |
| `type`     | string  | ✅   | `걷기`, `조깅`, `러닝` 중 하나 |
| `exclude`  | string  | ❌   | 있으면 `route-XXX` 형식        |

### POST /api/favorites, POST /api/history

| 파라미터   | 타입   | 검증                               |
| ---------- | ------ | ---------------------------------- |
| `userId`   | string | UUID v4 형식 (`/^[0-9a-f-]{36}$/`) |
| `courseId` | string | `route-` 접두사, 길이 ≤ 20         |

### GET /api/favorites, GET /api/history

| 파라미터 | 검증           |
| -------- | -------------- |
| `userId` | UUID 형식 필수 |

---

## 6. 의사결정 근거

| 결정 사항     | 선택                               | 이유                                            |
| ------------- | ---------------------------------- | ----------------------------------------------- |
| 계층 분리     | 라우터·컨트롤러·서비스             | 테스트 용이성, 역할 명확화                      |
| 랜덤 추출     | DB의 `ORDER BY RANDOM()`           | 애플리케이션 레벨 랜덤보다 단순 (소규모 데이터) |
| history limit | 서비스 레이어에서 쿼리 `LIMIT`     | DB에서 자르는 게 성능상 유리                    |
| userId 검증   | UUID 형식 regex                    | SQL Injection 방어 첫 번째 관문                 |
| 중복 즐겨찾기 | DB `UNIQUE` 제약 + 409 응답        | 서비스 레이어에서 별도 SELECT 없이 처리         |
| 이력 중복     | 허용 (동일 코스 여러 번 추천 가능) | 기획서 명세에 중복 방지 조건 없음               |

---

## 7. 위험 요소 및 대응

| 위험 요소                       | 대응 방안                                                     |
| ------------------------------- | ------------------------------------------------------------- |
| DB 없이 테스트 불가             | 서비스 계층을 분리해 유닛 테스트 가능 구조 유지               |
| `ORDER BY RANDOM()` 성능        | seed 데이터 10개 수준 — MVP에서 문제 없음                     |
| userId 위변조                   | UUID 형식 검증으로 최소 방어, MVP 범위에서는 이 수준으로 충분 |
| 빈 결과 (조건에 맞는 코스 없음) | 서비스에서 null 반환 → 컨트롤러에서 404 처리                  |

---

## 8. 완료 기준

- [ ] `GET /api/health` 기존 동작 유지
- [ ] 모든 라우터가 `app.js`에 등록됨
- [ ] 잘못된 파라미터 → 400 응답 `{ success: false, message: "..." }`
- [ ] 존재하지 않는 코스 ID → 404 응답
- [ ] 중복 즐겨찾기 → 409 응답
- [ ] 서비스 계층에서만 `db/index.js` 직접 사용 (컨트롤러·라우터에서 DB 접근 금지)
