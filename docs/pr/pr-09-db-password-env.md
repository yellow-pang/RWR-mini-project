# PR #09. DB 비밀번호 환경변수 로딩 보정

> 관련 작업 계획서: [docs/plans/plan-09-db-password-env.md](../plans/plan-09-db-password-env.md)  
> 관련 Step 문서: [docs/steps/step-09-db-password-env.md](../steps/step-09-db-password-env.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `fix/db-password-env` |
| 병합 대상 | `main` |
| 상태 | 진행 중 |

---

## PR 제목

```text
[Step 09] DB 비밀번호 환경변수 로딩 보정
```

---

## 개요

로컬 백엔드에서 `GET /api/courses/random?distance=3&time=60&type=running` 요청 시 `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` 오류가 발생했다.

Docker PostgreSQL 컨테이너 상태와 DB 접속을 확인한 결과, 컨테이너 자체는 정상이며 `server/.env`의 `DATABASE_URL`로 Node에서 DB에 접속할 수 있었다. 문제는 서버 실행 위치에 따라 `dotenv`가 `server/.env`를 읽지 못할 수 있는 구조로 판단했다.

---

## 주요 변경 사항

| 구분 | 내용 |
| --- | --- |
| 환경변수 로딩 | `server/src/config/env.js` 추가 |
| 앱 초기화 | `server/src/app.js`에서 환경변수를 먼저 로드 |
| 서버 진입점 | `server/server.js`의 직접 `dotenv.config()` 제거 |
| DB 설정 | `DATABASE_URL` 필수 검증 추가 |
| DB 설정 | `DATABASE_URL` 형식 및 비밀번호 포함 여부 검증 추가 |
| 문서 | Step 09 계획, PR, 완료 문서 작성 |

---

## 원인 판단

`server/server.js`에서 `require("dotenv").config()`를 호출하면 현재 작업 디렉터리 기준의 `.env`를 찾는다. 서버를 `server` 디렉터리에서 실행하면 `server/.env`가 로드되지만, 프로젝트 루트 등 다른 위치에서 서버 모듈을 로드하면 `server/.env`를 놓칠 수 있다.

그 결과 `process.env.DATABASE_URL`이 비어 있는 상태에서 `pg.Pool`이 생성될 수 있고, PostgreSQL 인증 과정에서 비밀번호 타입 오류로 이어질 수 있다.

---

## 변경 후 동작

`server/src/config/env.js`는 파일 위치 기준으로 `server/.env` 경로를 계산해 로드한다. 따라서 서버를 프로젝트 루트에서 로드하거나 `server` 디렉터리에서 실행해도 동일한 `.env`를 사용한다.

DB 모듈은 `DATABASE_URL`이 없거나, URL 형식이 아니거나, 비밀번호가 없는 경우 명확한 설정 오류를 발생시킨다.

---

## 검증 방법

Docker 상태 확인:

```powershell
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
docker compose -f docker-compose.dev.yml ps
```

서버 앱 로드:

```powershell
node -e "require('./server/src/app'); console.log('server app loaded')"
```

DB 접속 확인:

```powershell
node -e "const db=require('./server/src/db'); db.query('SELECT current_user, current_database(), COUNT(*)::int AS course_count FROM courses').then((r)=>{ console.log(JSON.stringify({success:true,...r.rows[0]})); process.exit(0); }).catch((err)=>{ console.error(JSON.stringify({success:false,message:err.message})); process.exit(1); })"
```

확인 결과:

```text
Docker PostgreSQL 컨테이너 healthy
server app loaded
current_user: rwr_user
current_database: rwr_db
course_count: 10
사용자 로컬 확인 기준 API 정상 진행
```

---

## 참고 사항

`distance=3&time=60&type=running` 조합은 현재 seed 데이터 기준으로 매칭 코스가 없을 수 있다. 이 경우 DB 연결 오류가 해결된 뒤에는 500이 아니라 `조건에 맞는 코스가 없습니다.` 응답이 정상 동작이다.

---

## 제외 범위

| 제외 항목 | 사유 |
| --- | --- |
| DB 볼륨 초기화 | 컨테이너와 seed 데이터가 정상 확인되어 불필요 |
| 코스 seed 추가 | 이번 작업은 DB 인증 오류 수정이 목적 |
| 로그인/지도/GPS/공유 기능 | MVP 외 또는 요청 범위 밖 |
| 커밋/push/PR 생성 | 사용자 확인 후 직접 진행 |
