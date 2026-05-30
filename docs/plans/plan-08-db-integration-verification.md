# 작업계획서 - Step 08: DB 연동 및 데이터 검증

> **상태**: 일부 진행 완료  
> **작성일**: 2026.05.29  
> **최종 수정일**: 2026.05.30  
> **브랜치**: `fix/course-type-encoding`  
> **목적**: 실제 PostgreSQL 환경에서 데이터 저장/조회 흐름 검증
> **관련 문서**: [step-08-db-integration-verification.md](../steps/step-08-db-integration-verification.md) | [pr-08-course-type-encoding.md](../pr/pr-08-course-type-encoding.md)

---

## 1. 결론

현재까지의 작업 기준으로 남은 핵심 작업은 **실제 DB 통합 검증**이다.

프론트엔드 화면, Express API 라우터, API 연동 코드, 오류 처리, 리팩토링은 준비되어 있으므로 다음 단계에서는 Docker/PostgreSQL이 실행 가능한 환경에서 아래를 확인하면 된다.

- seed 데이터가 PostgreSQL에 정상 입력되는지
- Express API가 DB에서 코스를 정상 조회하는지
- 추천 시 `history` 테이블에 데이터가 저장되는지
- 즐겨찾기 추가/삭제가 `favorites` 테이블에 반영되는지
- 프론트 화면에서 DB 데이터를 실제로 받아 표시하는지

2026.05.30 기준으로 추가 확인된 문제는 이동 유형 `type` 값의 한글 인코딩 깨짐이다. 프론트엔드가 깨진 문자열을 API로 전달하면서 서버 검증에서 400 오류가 발생했으므로, 내부/API/DB 저장 값은 ASCII enum(`walk`, `jogging`, `running`)으로 통일하고 사용자 화면과 오류 메시지만 한국어로 표시하도록 보정했다.

---

## 2. 검증 대상

| 영역 | 확인 내용 |
| --- | --- |
| PostgreSQL | `courses`, `favorites`, `history` 테이블 생성 여부 |
| Seed 데이터 | `courses` 테이블에 샘플 코스 데이터 입력 여부 |
| Express API | DB 기반 API 응답 정상 여부 |
| React Client | API 응답을 화면에 정상 표시하는지 |
| 데이터 쓰기 | 즐겨찾기/최근 이력이 DB에 저장되는지 |
| 데이터 읽기 | 저장된 즐겨찾기/최근 이력이 다시 조회되는지 |
| 인코딩 안정성 | 이동 유형이 ASCII enum으로 요청/검증/조회되는지 |

---

## 3. 사전 조건

| 조건 | 설명 |
| --- | --- |
| Docker 사용 가능 | `docker-compose`로 PostgreSQL과 서버 실행 가능해야 함 |
| 충분한 메모리 | PostgreSQL, Express, Vite 동시 실행 가능해야 함 |
| `.env` 설정 | 서버 DB 연결 정보가 실제 컨테이너와 일치해야 함 |
| seed 실행 | `server/src/db/seed.sql`이 DB 초기화 시 실행되어야 함 |

---

## 4. 실행 순서

실행 위치: `C:\dev\RWR_project`

CMD:

```cmd
docker compose up --build
```

PowerShell:

```powershell
docker compose up --build
```

기대 결과:

- PostgreSQL 컨테이너 실행
- server 컨테이너 실행
- client 또는 nginx 컨테이너 실행
- `courses` 테이블에 seed 데이터 생성

오류 발생 시 확인할 항목:

- Docker Desktop 실행 여부
- `.env` DB 연결 정보
- `docker-compose.yml`의 DB service 이름과 서버 접속 host 일치 여부
- PostgreSQL 포트 충돌 여부
- 메모리 부족 여부

---

## 5. API 검증 체크리스트

### 5.1 Health Check

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

기대 결과:

```json
{
  "success": true,
  "message": "RWR API Server is running"
}
```

---

### 5.2 랜덤 추천 조회

PowerShell:

```powershell
Invoke-RestMethod "http://localhost:3000/api/courses/random?distance=3&time=30&type=jogging"
```

기대 결과:

- `success: true`
- `data.id`
- `data.title`
- `data.distance`
- `data.time`
- `data.type`
- `data.description`

주의:

API 요청의 `type` 값은 인코딩 문제를 줄이기 위해 `walk`, `jogging`, `running` 중 하나를 사용한다. 화면에는 클라이언트에서 걷기, 조깅, 러닝으로 변환해 표시한다.

---

### 5.3 상세 조회

PowerShell:

```powershell
Invoke-RestMethod http://localhost:3000/api/courses/route-001
```

기대 결과:

- `success: true`
- `data.id`가 `route-001`
- 상세 필드 `description`, `reason`, `caution`, `tip` 존재

---

### 5.4 즐겨찾기 추가/조회/삭제

PowerShell:

```powershell
$userId = "550e8400-e29b-41d4-a716-446655440000"
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/favorites `
  -ContentType "application/json" `
  -Body (@{ userId = $userId; courseId = "route-001" } | ConvertTo-Json)
```

조회:

```powershell
Invoke-RestMethod "http://localhost:3000/api/favorites?userId=$userId"
```

삭제:

```powershell
Invoke-RestMethod `
  -Method Delete `
  -Uri "http://localhost:3000/api/favorites/route-001?userId=$userId"
```

기대 결과:

- 추가 시 `favorites` 테이블에 row 생성
- 조회 시 해당 course 포함
- 삭제 후 조회 시 해당 course 제거

---

### 5.5 최근 추천 이력 저장/조회

PowerShell:

```powershell
$userId = "550e8400-e29b-41d4-a716-446655440000"
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/history `
  -ContentType "application/json" `
  -Body (@{ userId = $userId; courseId = "route-001" } | ConvertTo-Json)
```

조회:

```powershell
Invoke-RestMethod "http://localhost:3000/api/history?userId=$userId&limit=10"
```

기대 결과:

- `history` 테이블에 row 생성
- 조회 시 최신순으로 반환
- 최대 10개 기준으로 화면 표시 가능

---

## 6. 프론트 화면 검증 체크리스트

| 화면 | 확인 내용 |
| --- | --- |
| 홈 | 조건 선택 후 추천 버튼 클릭 시 결과 화면 이동 |
| 결과 | DB에서 조회된 코스가 카드로 표시 |
| 결과 | 다시 추천 클릭 시 다른 코스 또는 결과 없음 메시지 표시 |
| 결과 | 저장 클릭 시 즐겨찾기 DB 저장 |
| 상세 | 상세 정보가 DB 데이터 기준으로 표시 |
| 즐겨찾기 | 저장한 코스가 목록에 표시 |
| 즐겨찾기 | 삭제 시 DB와 화면에서 제거 |
| 최근 | 추천한 코스가 최근 이력에 표시 |

---

## 7. DB 직접 확인 SQL

PostgreSQL 접속 후 확인:

```sql
SELECT COUNT(*) FROM courses;
SELECT * FROM courses ORDER BY id LIMIT 5;

SELECT * FROM favorites ORDER BY created_at DESC;
SELECT * FROM history ORDER BY recommended_at DESC;
```

기대 결과:

- `courses` count가 0보다 큼
- 추천/즐겨찾기/이력 API 호출 후 `favorites`, `history`에 row 생성

---

## 8. 남은 위험 요소

| 위험 요소 | 설명 | 권장 대응 |
| --- | --- | --- |
| 기존 DB type 값 혼재 | 기존 Docker 볼륨에는 한글 type, 신규 seed에는 ASCII type이 저장될 수 있음 | 서버 조회 호환 유지 후 실제 DB에서 추천 조회 확인 |
| Docker 메모리 부족 | 로컬 환경에서 컨테이너 실행 실패 가능 | DB만 먼저 띄우고 server/client는 로컬 실행하는 대안 검토 |
| CORS 설정 불일치 | client origin이 서버 `CORS_ORIGIN`에 없으면 실패 | `.env`의 `CORS_ORIGIN` 확인 |
| DB 연결 정보 불일치 | server가 PostgreSQL host/port를 못 찾을 수 있음 | `server/.env`, compose service name 확인 |

---

## 9. 완료 기준

- [ ] Docker/PostgreSQL 실행 성공
- [ ] `courses` seed 데이터 입력 확인
- [ ] `GET /api/courses/random` 정상 응답
- [ ] `GET /api/courses/:id` 정상 응답
- [ ] `POST /api/favorites` 후 DB 저장 확인
- [ ] `DELETE /api/favorites/:courseId` 후 DB 삭제 확인
- [ ] `POST /api/history` 후 DB 저장 확인
- [ ] React 화면에서 DB 기반 추천/즐겨찾기/이력 표시 확인
- [x] seed 인코딩 이슈 처리 방향 결정: 내부/DB 값은 ASCII enum, 화면 표시는 한글

---

## 10. 다음 액션

실행 가능한 개발 환경이 준비되면 이 문서의 순서대로 검증한다.  
검증 중 발견되는 문제는 별도 브랜치에서 `fix/db-integration-verification` 또는 `fix/seed-data-encoding` 범위로 처리하는 것을 권장한다.
