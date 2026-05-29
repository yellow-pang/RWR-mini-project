# Step 01. 개발 환경 세팅

> 작성일: 2026.05.28 | 단계: Step 01 / 8  
> PR 문서: [docs/pr/pr-01-dev-environment.md](../pr/pr-01-dev-environment.md)

---

## 1. 작업 목표

| #   | 목표                            | 완료 기준                                               |
| --- | ------------------------------- | ------------------------------------------------------- |
| 1   | 프론트엔드 프로젝트 구조 초기화 | `client/` Vite+React 앱, `/api` 프록시 설정             |
| 2   | 백엔드 프로젝트 구조 초기화     | `server/` Express 앱, `GET /api/health` 응답 확인       |
| 3   | DB 스키마·시드 파일 준비        | `schema.sql`, `seed.sql` 파일 작성 완료                 |
| 4   | Docker 운영 환경 뼈대           | Dockerfile×2, nginx.conf, docker-compose.yml 작성       |
| 5   | Docker 개발 환경 준비           | `docker-compose.dev.yml` (DB 컨테이너만)                |
| 6   | CI/CD 파이프라인 뼈대           | `.github/workflows/deploy.yml` 스켈레톤 작성            |
| 7   | 기획서 오류 수정                | 03-requirements.md 등 localStorage→PostgreSQL 전환 반영 |

---

## 2. 작업 배경

이전 세션에서 기획서(07-tech-stack, 06-data-spec, 09-prd, 08-schedule)를 풀스택+Docker 구조로 업데이트했습니다.  
이번 단계에서는 실제 코드 파일 구조를 만들고, 개발 서버를 실행할 수 있는 최소 뼈대를 완성합니다.

---

## 3. 아키텍처 개요

### 3.1 개발 환경 흐름

```
브라우저 (localhost:5173)
    │
    │ /api/* 요청
    ▼
Vite Dev Server (프록시)
    │ changeOrigin: true
    ▼
Express 서버 (localhost:3000)
    │
    ▼
PostgreSQL (localhost:5432, Docker Compose)
```

### 3.2 운영 환경 흐름

```
브라우저 (port 80)
    │
    ▼
Nginx 컨테이너
    ├── / → React SPA (정적 파일, try_files → index.html)
    └── /api/* → http://server:3000 (리버스 프록시)
                    │
                    ▼
              Express 컨테이너 (port 3000)
                    │
                    ▼
              PostgreSQL 컨테이너 (service: db, port 5432)
```

### 3.3 Docker Compose 구성 비교

| 파일                     | 환경 | 실행 서비스         | 목적                            |
| ------------------------ | ---- | ------------------- | ------------------------------- |
| `docker-compose.dev.yml` | 개발 | DB 컨테이너만       | 로컬 Node.js + Vite + Docker DB |
| `docker-compose.yml`     | 운영 | nginx + server + db | Ubuntu VM 배포                  |

---

## 4. 생성/수정 파일 목록

### 4.1 신규 생성

| 파일                             | 설명                                        |
| -------------------------------- | ------------------------------------------- |
| `client/vite.config.js`          | Vite 설정 + `/api` dev 프록시               |
| `client/.env.example`            | 프론트엔드 환경변수 템플릿                  |
| `client/Dockerfile`              | 멀티 스테이지 빌드 (Node 빌드 → Nginx 서빙) |
| `client/src/api/.gitkeep`        | API 함수 폴더 자리                          |
| `client/src/components/.gitkeep` | 공통 컴포넌트 폴더 자리                     |
| `client/src/pages/.gitkeep`      | 페이지 컴포넌트 폴더 자리                   |
| `client/src/context/.gitkeep`    | Context 폴더 자리                           |
| `client/src/utils/.gitkeep`      | 유틸 함수 폴더 자리                         |
| `server/package.json`            | Express 의존성 정의                         |
| `server/server.js`               | 서버 진입점 (dotenv + listen)               |
| `server/src/app.js`              | Express 앱 설정 + 헬스체크                  |
| `server/src/db/index.js`         | pg Pool 설정 및 query 헬퍼                  |
| `server/src/db/schema.sql`       | DB 테이블 3개 + 인덱스                      |
| `server/src/db/seed.sql`         | 샘플 코스 10개 INSERT                       |
| `server/.env.example`            | 서버 환경변수 템플릿                        |
| `server/Dockerfile`              | Node.js Express 이미지                      |
| `nginx/nginx.conf`               | SPA fallback + `/api` 리버스 프록시         |
| `docker-compose.yml`             | 운영 환경 (nginx+server+db)                 |
| `docker-compose.dev.yml`         | 개발 환경 (DB 컨테이너만)                   |
| `.github/workflows/deploy.yml`   | CI/CD 스켈레톤                              |

### 4.2 수정

| 파일                      | 수정 내용                                    |
| ------------------------- | -------------------------------------------- |
| `docs/03-requirements.md` | localStorage → PostgreSQL/API 참조 12곳 수정 |
| `docs/06-data-spec.md`    | seed.sql 내 JS 객체 리터럴 오류 제거         |
| `docs/10-roadmap.md`      | `즐겨찾기 (localStorage)` → PostgreSQL 반영  |
| `.gitignore`              | Node.js, Docker, .env 패턴 추가              |
| `README.md`               | 기술 스택 풀스택 반영 + 실행 방법 섹션 추가  |

---

## 5. 주요 파일 설명

### 5.1 client/vite.config.js — 개발 프록시

```js
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

개발 환경에서 `fetch('/api/courses')` 호출 시 Vite가 자동으로 `http://localhost:3000/api/courses`로 전달합니다.  
CORS 설정 없이도 로컬 개발이 가능합니다.

### 5.2 server/src/app.js — Express 헬스체크

`GET /api/health` 엔드포인트는 서버 기동 확인용입니다.

```
Response: { "success": true, "message": "RWR API Server is running", "timestamp": "..." }
```

실제 API 라우터(courses, favorites, history)는 Step 3~4에서 등록합니다.

### 5.3 client/Dockerfile — 멀티 스테이지 빌드

| 스테이지  | 베이스 이미지    | 역할                           |
| --------- | ---------------- | ------------------------------ |
| `builder` | `node:20-alpine` | `npm run build` → `dist/` 생성 |
| 최종      | `nginx:alpine`   | `dist/` + `nginx.conf` 포함    |

**주의**: build context를 프로젝트 루트(`.`)로 설정해야 `nginx/nginx.conf`에 접근할 수 있습니다.  
`docker-compose.yml`의 nginx 서비스에서 `context: .`로 설정됩니다.

### 5.4 nginx/nginx.conf — SPA + 프록시

```nginx
location / {
    try_files $uri $uri/ /index.html;   # SPA fallback
}

location /api/ {
    proxy_pass http://server:3000;      # Express 컨테이너로 전달
}
```

### 5.5 PostgreSQL 연결 방식

| 환경 | host             | 설정 위치                                 |
| ---- | ---------------- | ----------------------------------------- |
| 개발 | `localhost:5432` | `server/.env` (docker-compose.dev.yml DB) |
| 운영 | `db:5432`        | `docker-compose.yml` 환경변수             |

---

## 6. 실행 방법 (처음 설치)

> **사전 조건**: Node.js 20+, npm 10+  
> **Docker Desktop**: 선택사항 (PostgreSQL 로컬 테스트 시 필요)

### 6.1 프론트엔드 초기화

```powershell
# 실행 위치: C:\dev\RWR_project
npm create vite@latest client -- --template react
```

> ⚠️ "Directory is not empty" 프롬프트가 표시되면 **"Ignore files and continue"** 를 선택하세요.  
> `vite.config.js`, `.env.example`이 이미 생성되어 있으며 덮어쓰지 않습니다.

```powershell
cd client
npm install react-router-dom
cd ..
```

### 6.2 백엔드 의존성 설치

```powershell
# 실행 위치: C:\dev\RWR_project
cd server
npm install
cd ..
```

### 6.3 환경변수 설정

```powershell
# server/.env 파일 생성 (server/.env.example 복사)
copy server\.env.example server\.env

# client/.env.local 파일 생성 (필요시)
copy client\.env.example client\.env.local
```

### 6.4 개발 서버 실행

터미널 2개를 열어 각각 실행합니다.

```powershell
# 터미널 1 — Express 백엔드
cd server
npm run dev
# → http://localhost:3000

# 터미널 2 — React 프론트엔드
cd client
npm run dev
# → http://localhost:5173
```

### 6.5 DB 컨테이너 실행 (Docker Desktop 설치 후)

```powershell
# 실행 위치: C:\dev\RWR_project
docker-compose -f docker-compose.dev.yml up -d

# 중지
docker-compose -f docker-compose.dev.yml down
```

---

## 7. 검증 방법

### 7.1 백엔드 헬스체크

```powershell
curl http://localhost:3000/api/health
```

기대 응답:

```json
{
  "success": true,
  "message": "RWR API Server is running",
  "timestamp": "2026-05-28T00:00:00.000Z"
}
```

### 7.2 프론트엔드 기동 확인

브라우저에서 `http://localhost:5173` 접속 → Vite 기본 화면 표시

### 7.3 PostgreSQL 컨테이너 확인 (Docker 실행 후)

```powershell
# 컨테이너 상태 확인
docker-compose -f docker-compose.dev.yml ps

# DB 접속 테스트
docker exec -it rwr_project-db-1 psql -U rwr_user -d rwr_db -c "SELECT id, title FROM courses LIMIT 3;"
```

---

## 8. 오류 대처

| 증상                             | 원인                     | 해결                                                  |
| -------------------------------- | ------------------------ | ----------------------------------------------------- |
| `Cannot find module './src/app'` | `server/src/app.js` 없음 | 파일 생성 확인                                        |
| `EADDRINUSE: port 3000`          | 이미 3000 포트 사용 중   | `server/.env`의 `PORT` 값 변경                        |
| Vite에서 `/api` 응답 없음        | Express 서버 미기동      | `cd server && npm run dev` 확인                       |
| `pg connect ECONNREFUSED`        | DB 컨테이너 미실행       | `docker-compose -f docker-compose.dev.yml up -d` 실행 |
| Docker build context 오류        | nginx.conf 경로 문제     | `docker-compose.yml`에서 `context: .` 확인            |

---

## 9. 보안 고려사항

- `server/.env` 파일은 `.gitignore`에 포함되어 있어 GitHub에 올라가지 않습니다.
- `docker-compose.yml`의 DB 비밀번호는 로컬 개발용입니다. 운영 배포 시 Docker Secrets 또는 환경변수로 교체하세요.
- `deploy.yml`의 민감한 값(VM IP, SSH 키, API 키)은 GitHub Secrets에만 저장합니다.
- nginx 리버스 프록시 헤더(`X-Real-IP`, `X-Forwarded-For`)는 Express에서 `req.ip` 올바른 확인에 필요합니다.

---

## 10. 폴더 구조 (Step 1 완료 시점)

```
RWR_project/
├── .github/
│   └── workflows/
│       └── deploy.yml        ← CI/CD 스켈레톤
├── client/
│   ├── src/
│   │   ├── api/              ← Step 3에서 구현
│   │   ├── components/       ← Step 2에서 구현
│   │   ├── context/          ← Step 2에서 구현
│   │   ├── pages/            ← Step 2에서 구현
│   │   └── utils/            ← Step 2에서 구현
│   ├── .env.example
│   ├── Dockerfile            ← 멀티 스테이지 빌드
│   └── vite.config.js        ← /api 프록시 설정
├── docs/
│   ├── steps/
│   │   └── step-01-dev-environment.md   ← 이 파일
│   └── pr/
│       └── pr-01-dev-environment.md     ← PR 가이드
├── nginx/
│   └── nginx.conf            ← SPA fallback + /api 프록시
├── server/
│   ├── src/
│   │   ├── app.js            ← Express 앱 + 헬스체크
│   │   └── db/
│   │       ├── index.js      ← pg Pool
│   │       ├── schema.sql    ← 테이블 3개 + 인덱스
│   │       └── seed.sql      ← 코스 10개 시드
│   ├── .env.example
│   ├── Dockerfile
│   ├── package.json
│   └── server.js             ← 진입점
├── .gitignore
├── docker-compose.dev.yml    ← 개발: DB 컨테이너만
├── docker-compose.yml        ← 운영: nginx+server+db
└── README.md
```

---

## 11. 다음 단계 (Step 02 예고)

| 작업              | 내용                                                    |
| ----------------- | ------------------------------------------------------- |
| React Router 설정 | `client/src/main.jsx` + `App.jsx` 라우팅 구조           |
| 공통 컴포넌트     | `BottomNav`, `CourseCard`, `EmptyState`                 |
| UserContext       | `crypto.randomUUID()` → `localStorage.rwr_user_id` 관리 |
| 메인 페이지 UI    | 조건 선택 폼 (거리·시간·유형)                           |
