# Step 03. Express API 라우터 구현

> **작성일**: 2026.05.29  
> **브랜치**: `feat/step-03-express-api`  
> **관련 문서**: [작업계획서](../plans/plan-03-express-api.md) | [PR 문서](../pr/pr-03-express-api.md)

---

## 1. 작업 목표

courses / favorites / history REST API 엔드포인트를 구현한다.  
라우터 → 컨트롤러 → 서비스 3계층 구조로 분리하며,  
express-validator 입력 검증, 전역 에러 핸들러, 서버 보안 미들웨어(helmet + body size limit)를 적용한다.

---

## 2. 작업 배경

Step 01에서 `app.js`에 라우터 등록 코드를 TODO 주석으로 남겨두었다.  
Step 02에서 클라이언트 API stub 함수를 정의했으므로,  
이제 실제 서버 엔드포인트를 만들어 Step 05 연동의 기반을 마련한다.

---

## 3. 아키텍처 개요

```mermaid
flowchart TD
    REQ[HTTP 요청] --> R

    subgraph server/src
        R[routes/\n경로 + 검증] --> C[controllers/\n요청 파싱 + 응답]
        C --> S[services/\nDB 쿼리 로직]
        S --> DB[db/index.js\npg Pool]
    end

    DB --> PG[(PostgreSQL)]
```

### 폴더 구조 (Step 03 완료 후)

```
server/src/
├── app.js               ← 라우터 등록 활성화
├── db/
│   ├── index.js
│   ├── schema.sql
│   └── seed.sql
├── routes/
│   ├── courses.js
│   ├── favorites.js
│   └── history.js
├── controllers/
│   ├── coursesController.js
│   ├── favoritesController.js
│   └── historyController.js
└── services/
    ├── coursesService.js
    ├── favoritesService.js
    └── historyService.js
```

---

## 4. 생성/수정 파일 목록

### 수정

| 파일                | 수정 내용                                                                  |
| ------------------- | -------------------------------------------------------------------------- |
| `server/src/app.js` | 라우터 등록 + `helmet()` 보안 헤더 + `express.json({ limit: '4kb' })` 추가 |

### 생성

| 파일                                            | 설명                                                |
| ----------------------------------------------- | --------------------------------------------------- |
| `server/src/routes/courses.js`                  | 코스 라우터 + express-validator 검증                |
| `server/src/routes/favorites.js`                | 즐겨찾기 라우터 + 검증 (uuidRule/courseIdRule 헬퍼) |
| `server/src/routes/history.js`                  | 이력 라우터 + 검증                                  |
| `server/src/controllers/coursesController.js`   | 코스 컨트롤러                                       |
| `server/src/controllers/favoritesController.js` | 즐겨찾기 컨트롤러 (23505 중복 오류 → 409 처리)      |
| `server/src/controllers/historyController.js`   | 이력 컨트롤러                                       |
| `server/src/services/coursesService.js`         | 코스 DB 쿼리 (COURSE_COLUMNS 상수로 컬럼 명시)      |
| `server/src/services/favoritesService.js`       | 즐겨찾기 DB 쿼리 (courses JOIN으로 상세 정보 포함)  |
| `server/src/services/historyService.js`         | 이력 DB 쿼리 (courses JOIN으로 상세 정보 포함)      |

---

## 5. 엔드포인트 명세

### 5-1. 코스 API

#### `GET /api/courses/random`

| 파라미터   | 필수 | 허용값                 | 설명                       |
| ---------- | ---- | ---------------------- | -------------------------- |
| `distance` | ✅   | `1`, `3`, `5`          | 거리(km)                   |
| `time`     | ✅   | `15`, `30`, `60`       | 소요 시간(분)              |
| `type`     | ✅   | `걷기`, `조깅`, `러닝` | 운동 유형                  |
| `exclude`  | ❌   | `route-XXX`            | 제외할 코스 ID (다시 추천) |

```json
// 성공 응답 200
{ "success": true, "data": { "id": "route-001", "title": "서울숲 둘레길", ... } }

// 조건에 맞는 코스 없음 404
{ "success": false, "message": "조건에 맞는 코스가 없습니다." }
```

#### `GET /api/courses/:id`

```json
// 성공 200
{ "success": true, "data": { "id": "route-001", ... } }

// 없는 ID 404
{ "success": false, "message": "코스를 찾을 수 없습니다." }
```

---

### 5-2. 즐겨찾기 API

#### `GET /api/favorites?userId=<uuid>`

```json
// 성공 200 (없으면 빈 배열)
{ "success": true, "data": [ { "id": 1, "courseId": "route-001", ... } ] }
```

#### `POST /api/favorites`

```json
// Request Body
{ "userId": "550e8400-...", "courseId": "route-001" }

// 성공 201
{ "success": true, "data": { "id": 5, "userId": "...", "courseId": "route-001", "createdAt": "..." } }

// 중복 409
{ "success": false, "message": "이미 즐겨찾기에 추가된 코스입니다." }
```

#### `DELETE /api/favorites/:courseId?userId=<uuid>`

```json
// 성공 200
{ "success": true }

// 없는 항목 404
{ "success": false, "message": "즐겨찾기 항목을 찾을 수 없습니다." }
```

---

### 5-3. 이력 API

#### `GET /api/history?userId=<uuid>&limit=10`

```json
// 성공 200
{
  "success": true,
  "data": [{ "id": 1, "courseId": "route-001", "recommendedAt": "..." }]
}
```

#### `POST /api/history`

```json
// Request Body
{ "userId": "550e8400-...", "courseId": "route-001" }

// 성공 201
{ "success": true, "data": { "id": 10, "userId": "...", "courseId": "route-001", "recommendedAt": "..." } }
```

---

## 6. 검증 규칙 (express-validator)

| 파라미터   | 검증 규칙                                                           | 실패 응답 | 비고                                       |
| ---------- | ------------------------------------------------------------------- | --------- | ------------------------------------------ |
| `distance` | `isInt()` + `isIn([1,3,5])`                                         | 400       | `.toInt()`으로 자동 변환                   |
| `time`     | `isInt()` + `isIn([15,30,60])`                                      | 400       | `.toInt()`으로 자동 변환                   |
| `type`     | `.trim()` → `.notEmpty()` → `isIn(['걷기','조깅','러닝'])`          | 400       | trim 먼저 — 공백만 있으면 "필수" 오류 반환 |
| `userId`   | `isUUID(4)`                                                         | 400       | UUID v4 형식 강제                          |
| `courseId` | `.trim()` + `matches(/^route-[a-z0-9-]+$/)` + `isLength({max:20})`  | 400       | 임의 문자열 주입 방지                      |
| `exclude`  | `optional` + `matches(/^route-[a-z0-9-]+$/)` + `isLength({max:20})` | 400       | 다시 추천 시 제외 ID                       |
| `limit`    | `optional` + `isInt({min:1,max:50})` + `.toInt()`                   | 400       | 서비스 기본값 10 사용                      |

---

## 7. 실행 방법

```
실행 위치: C:\dev\RWR_project\server

CMD:
npm install
npm run dev

기대 결과:
RWR API Server running on port 3000 출력
http://localhost:3000/api/health → {"success":true, ...} 응답
```

> ⚠️ DB 없이 실행 시 서버는 기동되지만, DB 쿼리 호출 시 연결 오류 발생  
> DB 연결 실제 테스트는 Step 07 Docker 환경에서 진행

---

## 8. 검증 방법 (서버 기동 후)

| 검증 항목      | 명령어 (PowerShell)                                                              |
| -------------- | -------------------------------------------------------------------------------- |
| 헬스체크 유지  | `Invoke-RestMethod http://localhost:3000/api/health`                             |
| 검증 오류 확인 | `Invoke-RestMethod "http://localhost:3000/api/courses/random?distance=99"` → 400 |
| 없는 경로      | `Invoke-RestMethod http://localhost:3000/api/wrong` → 404                        |

---

## 9. 오류 대처

| 오류                                    | 원인                      | 해결                                       |
| --------------------------------------- | ------------------------- | ------------------------------------------ |
| `Cannot find module './routes/courses'` | 파일 경로 오타            | `server/src/routes/courses.js` 존재 확인   |
| `ValidationError` 미동작                | `validationResult` 미호출 | 컨트롤러 상단 `validationResult(req)` 확인 |
| DB 연결 오류                            | PostgreSQL 미실행         | 정상 — Step 07에서 해결                    |
| `UNIQUE constraint` → 500 응답          | 중복 즐겨찾기 오류 미처리 | 서비스에서 `23505` 오류 코드 catch         |

---

## 10. 보안 고려사항

### 적용된 보안 조치

| 항목                                            | 구현 위치                | 이유                                                                  |
| ----------------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| `helmet()` 미들웨어                             | `app.js`                 | 12개 보안 HTTP 헤더 자동 설정 (XSS, clickjacking, MIME sniffing 방어) |
| `express.json({ limit: '4kb' })`                | `app.js`                 | 대용량 페이로드로 서버 메모리 소진하는 DoS 공격 방어                  |
| Parameterized Query (`$1`, `$2`)                | 모든 서비스              | SQL Injection 방어 — 사용자 입력이 SQL 구조에 영향을 줄 수 없음       |
| `userId` UUID v4 형식 검증                      | 모든 라우터              | 임의 문자열로 타인 데이터 접근 시도 방어                              |
| `courseId` 정규식 검증 (`/^route-[a-z0-9-]+$/`) | 모든 라우터              | 경로 조작 및 임의 문자열 주입 방지                                    |
| `.trim()` → `.notEmpty()` 순서 보장             | `routes/courses.js`      | 공백 문자열이 필수 검증을 통과하는 버그 방지                          |
| `limit` 최대값 제한 (`max: 50`)                 | `routes/history.js`      | 과도한 데이터 조회 방지                                               |
| 전역 에러 핸들러에서 스택 트레이스 미노출       | `app.js`                 | 내부 구조 정보 유출 방지                                              |
| DB 오류 코드 처리 (`23505` → 409)               | `favoritesController.js` | 중복 즐겨찾기를 500이 아닌 의미있는 오류로 처리                       |

### helmet이 설정하는 주요 헤더

| 헤더                        | 값                   | 효과                               |
| --------------------------- | -------------------- | ---------------------------------- |
| `X-Content-Type-Options`    | `nosniff`            | MIME 타입 스니핑으로 XSS 공격 방지 |
| `X-Frame-Options`           | `SAMEORIGIN`         | 클릭재킹(Clickjacking) 방지        |
| `Content-Security-Policy`   | `default-src 'self'` | 외부 스크립트·리소스 로드 차단     |
| `Strict-Transport-Security` | `max-age=31536000`   | HTTPS 강제 (HSTS)                  |
| `X-DNS-Prefetch-Control`    | `off`                | DNS 프리패치로 인한 정보 유출 방지 |
| `Referrer-Policy`           | `no-referrer`        | 이전 URL 정보 외부 전송 차단       |

### SELECT 컬럼 명시 (`SELECT *` 지양)

`coursesService.js`에서 `SELECT *` 대신 `COURSE_COLUMNS` 상수로 컬럼을 명시한다.  
이유: 추후 스키마에 민감한 컬럼이 추가될 때 의도치 않게 클라이언트에 노출되는 것을 방지한다.

```js
const COURSE_COLUMNS = `
  id, title, distance, time, type, mood,
  description, reason, caution, tip
`;
```

---

## 11. 다음 단계 예고

**Step 04: React 주요 화면 구현**

- 조건 선택 칩 UI + 상태 관리
- 코스 결과 카드 컴포넌트
- 즐겨찾기·이력 목록 화면 디자인 완성
- 빈 상태(Empty State) UI
