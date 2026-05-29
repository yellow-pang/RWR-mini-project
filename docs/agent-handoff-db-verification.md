# 개발 환경 에이전트 인수인계 프롬프트

아래 내용을 다음 개발 환경 에이전트에게 그대로 전달하세요.

---

## 역할

당신은 경력 20년차 시니어 풀스택 개발자입니다.

현재 프로젝트는 `React + Express + PostgreSQL` 기반 풀스택 웹 서비스입니다.  
기획서와 단계별 문서를 먼저 읽고, 기존 구현을 보존하면서 실제 DB 통합 검증을 진행해야 합니다.

---

## 프로젝트 경로

```text
C:\dev\RWR_project
```

---

## 현재 프로젝트 상태 요약

지도 API 연동을 MVP 범위에서 제외하면, **MVP 기능 구현은 완료된 상태**입니다.

현재 완료된 범위:

- React Router 기반 화면 구조
- Home / Result / Detail / Favorites / History 화면
- 조건 선택 기반 랜덤 추천 UI
- Express API 라우터 구현
- PostgreSQL schema/seed 작성
- 프론트-백엔드 API 연동
- 익명 UUID 기반 사용자 식별
- 즐겨찾기 저장/삭제/조회
- 최근 추천 이력 저장/조회
- 오류 처리 및 보안 보완
- 리팩토링 및 테스트 문서화

아직 남은 핵심 작업:

```text
실제 PostgreSQL 환경에서 데이터가 정상 저장/조회되는지 통합 검증
```

---

## 반드시 먼저 읽을 문서

아래 순서로 읽고 현재 상태를 파악하세요.

```text
docs/01-overview.md
docs/03-requirements.md
docs/06-data-spec.md

docs/plans/plan-05-api-integration.md
docs/steps/step-05-api-integration.md
docs/pr/pr-05-api-integration.md

docs/plans/plan-06-error-security.md
docs/steps/step-06-error-security.md
docs/pr/pr-06-error-security.md

docs/plans/plan-07-test-docs-refactor.md
docs/steps/step-07-test-docs-refactor.md
docs/pr/pr-07-test-docs-refactor.md

docs/plans/plan-08-db-integration-verification.md
```

특히 `docs/plans/plan-08-db-integration-verification.md`가 다음 작업의 기준 문서입니다.

---

## 현재 코드 구조

```text
RWR_project/
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.js
│   │   │   ├── courses.js
│   │   │   ├── favorites.js
│   │   │   └── history.js
│   │   ├── components/
│   │   ├── constants/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   └── utils/
│   └── package.json
├── server/
│   ├── src/
│   │   ├── app.js
│   │   ├── controllers/
│   │   ├── db/
│   │   │   ├── index.js
│   │   │   ├── schema.sql
│   │   │   └── seed.sql
│   │   ├── routes/
│   │   └── services/
│   └── package.json
├── docker-compose.yml
├── docker-compose.dev.yml
└── docs/
```

---

## 다음 작업 목표

다음 작업의 목표는 **기능 개발이 아니라 실제 DB 통합 검증**입니다.

확인해야 할 것:

1. PostgreSQL이 정상 실행되는지
2. `schema.sql`로 테이블이 생성되는지
3. `seed.sql`로 `courses` 데이터가 들어가는지
4. `GET /api/courses/random`이 DB 데이터를 반환하는지
5. `GET /api/courses/:id`가 상세 데이터를 반환하는지
6. `POST /api/favorites`가 DB에 저장되는지
7. `DELETE /api/favorites/:courseId`가 DB에서 삭제되는지
8. `POST /api/history`가 DB에 저장되는지
9. `GET /api/history`가 최근 추천 이력을 반환하는지
10. React 화면에서 실제 DB 기반 데이터가 표시되는지

---

## 중요한 주의사항

### 1. 기능을 새로 추가하지 마세요

지도 API, GPS, 공유 기능, 로그인, 인증, 사용자 코스 등록은 현재 작업 범위가 아닙니다.

이번 작업은:

```text
DB 통합 검증 + 필요 시 최소 수정
```

입니다.

### 2. 기존 기능을 제거하지 마세요

아래 기능은 반드시 유지되어야 합니다.

| 기능 | 유지 여부 |
| --- | --- |
| 조건 선택 | 유지 |
| 랜덤 추천 | 유지 |
| 다시 추천 | 유지 |
| 상세 보기 | 유지 |
| 즐겨찾기 저장/삭제/조회 | 유지 |
| 최근 추천 이력 저장/조회 | 유지 |
| 익명 UUID | 유지 |
| API 오류 메시지 | 유지 |

### 3. seed 데이터 인코딩 이슈를 주의하세요

현재 서버 seed 데이터와 일부 서버 검증값에 한글 인코딩 깨짐이 남아 있을 가능성이 있습니다.

검증 중 다음 중 하나를 판단하세요.

| 선택지 | 설명 |
| --- | --- |
| A | 현재 깨진 서버 저장값 기준으로 통합 검증만 진행 |
| B | seed/schema/routes의 type/mood 값을 정상 한국어로 정리 |
| C | 인코딩 정리는 별도 브랜치로 이관 |

권장:

```text
DB 통합 검증을 먼저 수행하고, 인코딩 문제가 실제 화면/API에 영향을 주면 별도 수정 범위를 제안
```

### 4. 커밋/브랜치/push/PR은 사용자가 직접 합니다

에이전트는 직접 실행하지 않습니다.

---

## 권장 브랜치명

아직 브랜치를 만들지 않았다면 아래를 추천합니다.

```text
test/db-integration-verification
```

또는 seed 데이터 정리까지 포함한다면:

```text
fix/db-seed-integration
```

권장:

```text
test/db-integration-verification
```

---

## 실행 전 확인할 파일

```text
server/.env
docker-compose.yml
docker-compose.dev.yml
server/src/db/index.js
server/src/db/schema.sql
server/src/db/seed.sql
server/src/app.js
```

확인할 항목:

- DB host
- DB port
- DB user
- DB password
- DB name
- Docker compose service name
- `CORS_ORIGIN`
- `JSON_BODY_LIMIT`

---

## 검증 명령어 예시

실행 위치:

```text
C:\dev\RWR_project
```

CMD:

```cmd
docker compose up --build
```

PowerShell:

```powershell
docker compose up --build
```

서버 health check:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

랜덤 추천:

```powershell
Invoke-RestMethod "http://localhost:3000/api/courses/random?distance=3&time=30&type=議곌퉭"
```

상세 조회:

```powershell
Invoke-RestMethod http://localhost:3000/api/courses/route-001
```

즐겨찾기 추가:

```powershell
$userId = "550e8400-e29b-41d4-a716-446655440000"
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/favorites `
  -ContentType "application/json" `
  -Body (@{ userId = $userId; courseId = "route-001" } | ConvertTo-Json)
```

즐겨찾기 조회:

```powershell
Invoke-RestMethod "http://localhost:3000/api/favorites?userId=$userId"
```

최근 이력 추가:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/history `
  -ContentType "application/json" `
  -Body (@{ userId = $userId; courseId = "route-001" } | ConvertTo-Json)
```

최근 이력 조회:

```powershell
Invoke-RestMethod "http://localhost:3000/api/history?userId=$userId&limit=10"
```

---

## DB 직접 확인 SQL

PostgreSQL 접속 후:

```sql
SELECT COUNT(*) FROM courses;
SELECT * FROM courses ORDER BY id LIMIT 5;

SELECT * FROM favorites ORDER BY created_at DESC;
SELECT * FROM history ORDER BY recommended_at DESC;
```

확인 기준:

- `courses` row count가 0보다 커야 함
- 즐겨찾기 추가 후 `favorites`에 row 생성
- 즐겨찾기 삭제 후 해당 row 제거
- 추천 이력 추가 후 `history`에 row 생성

---

## 프론트 화면 검증

브라우저에서 확인:

```text
http://localhost:5173
```

체크리스트:

- 홈 화면 표시
- 거리/시간/이동 유형 선택
- 추천받기 클릭
- 결과 화면에 DB 코스 표시
- 다시 추천 클릭
- 상세 보기 이동
- 즐겨찾기 저장
- 즐겨찾기 화면에서 저장된 코스 확인
- 즐겨찾기 삭제
- 최근 화면에서 추천 이력 확인

---

## 검증 결과 문서화

검증 후 아래 문서를 생성하거나 업데이트하세요.

권장 생성:

```text
docs/steps/step-08-db-integration-verification.md
docs/pr/pr-08-db-integration-verification.md
```

문서에 포함할 것:

- 실행 환경
- 실행 명령어
- 성공한 API
- 실패한 API
- DB row 확인 결과
- 프론트 화면 확인 결과
- 발견된 문제
- 후속 수정 필요 여부

---

## 완료 기준

아래가 모두 확인되면 MVP는 “구현 + 통합 검증 완료” 상태로 볼 수 있습니다.

- [ ] PostgreSQL 실행 성공
- [ ] schema 생성 확인
- [ ] seed 데이터 입력 확인
- [ ] 랜덤 추천 API 성공
- [ ] 상세 조회 API 성공
- [ ] 즐겨찾기 저장/조회/삭제 성공
- [ ] 최근 이력 저장/조회 성공
- [ ] React 화면에서 실제 DB 데이터 표시 확인
- [ ] 검증 결과 문서 작성

---

## 최종 판단 기준

지도 API를 MVP 이후 확장 기능으로 제외한다면:

```text
DB 통합 검증까지 완료되면 MVP 완료로 판단 가능
```

