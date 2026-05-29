# 작업계획서 — Step 01: 개발 환경 세팅

> **상태**: ✅ 완료  
> **작성일**: 2026.05.29 (사후 작성)  
> **관련 문서**: [step-01-dev-environment.md](../steps/step-01-dev-environment.md) | [pr-01-dev-environment.md](../pr/pr-01-dev-environment.md)

---

## 1. 목표

React + Vite 프론트엔드, Node.js + Express 백엔드, PostgreSQL DB, Nginx 리버스 프록시를
Docker Compose로 묶는 풀스택 개발 환경 뼈대를 구성한다.

---

## 2. 작업 범위

### 생성한 파일

| 파일 | 설명 |
|------|------|
| `client/vite.config.js` | `/api` 프록시 설정 |
| `client/Dockerfile` | 멀티 스테이지 빌드 |
| `client/.env.example` | 환경변수 예시 |
| `server/package.json` | 의존성 목록 (express, pg, cors, dotenv, express-validator) |
| `server/server.js` | 서버 진입점 |
| `server/src/app.js` | Express 앱 설정, `GET /api/health` |
| `server/src/db/index.js` | pg Pool 설정 |
| `server/src/db/schema.sql` | courses / favorites / history 테이블 + 인덱스 |
| `server/src/db/seed.sql` | 코스 10개 INSERT |
| `server/Dockerfile` | Node.js 멀티 스테이지 빌드 |
| `server/.env.example` | DB 연결 환경변수 예시 |
| `nginx/nginx.conf` | SPA fallback + `/api` 리버스 프록시 |
| `docker-compose.yml` | 운영 환경 (nginx + server + db) |
| `docker-compose.dev.yml` | 개발 환경 (DB 컨테이너만) |
| `.github/workflows/deploy.yml` | CI/CD 스켈레톤 |

### 수정한 파일

| 파일 | 수정 내용 |
|------|-----------|
| `docs/03-requirements.md` | localStorage 참조 → PostgreSQL/API 참조 전환 |
| `docs/06-data-spec.md` | seed.sql JS 리터럴 오류 제거 |
| `docs/10-roadmap.md` | 단계별 일정 업데이트 |
| `.gitignore` | node_modules, .env 등 추가 |
| `README.md` | 실행 방법 섹션 추가 |

### 제외 항목

| 제외 내용 | 이유 |
|-----------|------|
| 실제 API 라우터 구현 | Step 03 |
| React 컴포넌트 구현 | Step 02~04 |
| Docker 운영 배포 실행 | Step 07 이후 |

---

## 3. 의사결정 근거

| 결정 사항 | 선택 | 이유 |
|-----------|------|------|
| 상태 관리 | localStorage (UUID만) | MVP 규모에 전역 상태 불필요 |
| DB | PostgreSQL | 즐겨찾기·이력 서버 저장 필요 |
| 인증 | 익명 UUID | 로그인 복잡도 제외 |
| 스타일 | 순수 CSS | 의존성 최소화, 학습 목적 |

---

## 4. 완료 기준 (사후 확인)

- [x] `GET /api/health` → `{"success":true}` 응답
- [x] `http://localhost:5173` Vite 기본 화면 표시
- [x] schema.sql 문법 오류 없음
- [x] .gitignore에 .env, node_modules 포함
