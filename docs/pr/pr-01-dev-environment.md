# PR #01 — Step 01: 개발 환경 세팅

> 관련 Step 문서: [docs/steps/step-01-dev-environment.md](../steps/step-01-dev-environment.md)

---

## 브랜치 정보

| 항목        | 값                                                |
| ----------- | ------------------------------------------------- |
| 작업 브랜치 | `feature/step-01-dev-environment`                 |
| 병합 대상   | `main`                                            |
| PR 상태     | `[ ] 진행 중` / `[ ] 리뷰 요청` / `[ ] 병합 완료` |

---

## GitHub PR 제목 (복사해서 사용)

```
[Step 01] 개발 환경 세팅 — React/Express 풀스택 초기 구조, Docker Compose, CI/CD 스켈레톤
```

---

## GitHub PR 본문 (복사해서 사용)

```markdown
## 개요

RWR 프로젝트 Step 01: 개발 환경 세팅 완료

React + Vite 프론트엔드, Node.js + Express 백엔드, PostgreSQL(Docker Compose),
Nginx 리버스 프록시, GitHub Actions CI/CD 파이프라인 뼈대를 구성합니다.

## 주요 변경사항

- `client/` : Vite + React 초기 구조, `/api` 개발 프록시, 멀티 스테이지 Dockerfile
- `server/` : Express 앱 기본 구조, `GET /api/health` 헬스체크, pg Pool 설정
- `server/src/db/` : schema.sql (테이블 3개 + 인덱스), seed.sql (코스 10개)
- `nginx/nginx.conf` : SPA fallback + `/api` 리버스 프록시
- `docker-compose.yml` : 운영 환경 (nginx + server + db)
- `docker-compose.dev.yml` : 개발 환경 (DB 컨테이너만)
- `.github/workflows/deploy.yml` : CI/CD 스켈레톤
- 기획서 오류 수정: `localStorage` → PostgreSQL/API 참조 전환

## 테스트 방법

1. `cd server && npm install && npm run dev` → `http://localhost:3000/api/health` 응답 확인
2. `cd client && npm install && npm run dev` → `http://localhost:5173` Vite 화면 확인

## 관련 문서

- Step 문서: `docs/steps/step-01-dev-environment.md`
```

---

## 포함된 커밋 목록

> 커밋할 때마다 아래 표에 행을 추가하세요.  
> 커밋 메시지 규칙: `type(scope): 설명` — type: `feat` `fix` `chore` `docs` `refactor`

| #   | 커밋 해시 | 커밋 메시지                     | 변경 내용 요약      | 날짜 |
| --- | --------- | ------------------------------- | ------------------- | ---- |
| 1   |           | `chore: Step 01 초기 구조 설정` | 전체 뼈대 파일 생성 |      |

> 추가 커밋 예시:
>
> - `fix(server): cors origin 설정 수정`
> - `fix(client): vite proxy 경로 수정`
> - `docs: step-01 문서 오타 수정`

---

## 변경 파일 체크리스트

PR 전 아래 파일들이 정상 상태인지 확인하세요.

### 신규 생성

- [ ] `client/vite.config.js` — `/api` 프록시 확인
- [ ] `client/Dockerfile` — 멀티 스테이지 빌드
- [ ] `client/.env.example`
- [ ] `server/package.json` — 의존성 목록
- [ ] `server/server.js`
- [ ] `server/src/app.js` — `/api/health` 동작 확인
- [ ] `server/src/db/index.js`
- [ ] `server/src/db/schema.sql`
- [ ] `server/src/db/seed.sql`
- [ ] `server/Dockerfile`
- [ ] `server/.env.example`
- [ ] `nginx/nginx.conf`
- [ ] `docker-compose.yml`
- [ ] `docker-compose.dev.yml`
- [ ] `.github/workflows/deploy.yml`

### 수정

- [ ] `docs/03-requirements.md` — localStorage 참조 제거 확인
- [ ] `docs/06-data-spec.md` — seed.sql JS 리터럴 오류 제거 확인
- [ ] `docs/10-roadmap.md`
- [ ] `.gitignore` — node_modules, .env 등 포함 확인
- [ ] `README.md` — 실행 방법 섹션 추가 확인

### 제외 확인 (커밋에 포함되면 안 되는 파일)

- [ ] `server/.env` — `.gitignore`에 포함됨
- [ ] `client/.env.local` — `.gitignore`에 포함됨
- [ ] `node_modules/` — `.gitignore`에 포함됨

---

## 테스트 체크리스트

PR 올리기 전 아래 항목을 직접 확인하세요.

### 백엔드

- [ ] `npm run dev` 정상 실행 (port 3000)
- [ ] `GET /api/health` → `{"success":true}` 응답
- [ ] 존재하지 않는 경로 → 404 응답

### 프론트엔드

- [ ] `npm run dev` 정상 실행 (port 5173)
- [ ] 브라우저에서 `http://localhost:5173` 화면 표시
- [ ] 개발 도구 콘솔에 오류 없음

### 빌드 (선택)

- [ ] `cd client && npm run build` 오류 없음

---

## 리뷰어에게

> 이 PR은 Step 01 개발 환경 세팅 단계입니다.  
> 실제 기능 구현(API 라우터, UI 컴포넌트)은 Step 02~04에서 진행됩니다.  
> Docker Compose 운영 환경(`docker-compose.yml`)은 아직 실행하지 않으며, 뼈대만 검토 요청합니다.

---

## 업데이트 이력

> 이 PR 문서에서 발생한 수정 사항을 기록합니다.

| 날짜       | 변경 내용         | 관련 커밋 |
| ---------- | ----------------- | --------- |
| 2026.05.29 | PR 문서 초안 작성 | —         |
