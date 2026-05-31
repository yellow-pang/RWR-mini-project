# Plan 13. VM 배포 환경 구성

> **작성일**: 2026.05.31
> **브랜치**: `feat/vm-deployment-setup` 권장
> **전제 조건**: Step 12 완료 (API Base URL 수정)

---

## 1. 목표

Ubuntu 24.04 VM에 Docker + Cloudflare Tunnel + GitHub Actions self-hosted runner를 이용해 RWR 프로젝트 운영 배포 환경을 구성한다.

---

## 2. 환경 현황

### 2.1 VM 정보

| 항목           | 값                                        |
| -------------- | ----------------------------------------- |
| OS             | Ubuntu 24.04 LTS (x86_64)                 |
| 외부 노출 방식 | Cloudflare Tunnel (무료 플랜)             |
| 도메인         | 서브도메인 `rwr.*`                        |
| CI/CD          | GitHub Actions (self-hosted runner)       |
| Jenkins        | 다른 프로젝트 전용 — RWR에서는 사용 안 함 |

### 2.2 VM 사용 중인 포트 (충돌 방지)

| 포트  | 컨테이너               |
| ----- | ---------------------- |
| 3000  | health-center-frontend |
| 3001  | Grafana                |
| 3100  | Loki                   |
| 5432  | health-center-postgres |
| 8080  | health-center-backend  |
| 8081  | Jenkins                |
| 9090  | Prometheus             |
| 50000 | Jenkins                |

### 2.3 RWR 포트 할당

| 서비스                    | 내부 포트 | 외부 노출 포트 | 비고                                         |
| ------------------------- | --------- | -------------- | -------------------------------------------- |
| nginx (SPA + /api 프록시) | 80        | **8090**       | Cloudflare Tunnel 연결 대상                  |
| Express API               | 3000      | **미노출**     | Docker 내부 네트워크만                       |
| PostgreSQL                | 5432      | **미노출**     | Docker 내부 네트워크만 (5432는 이미 사용 중) |

---

## 3. 환경변수 통합 전략

현재 `server/.env.example`과 `client/.env.example`에 분산된 환경변수를 루트 `.env.example` 하나로 통합한다.

### 루트 `.env.example` 구조

```
# ─── Nginx ──────────────────────────────────────
NGINX_PORT=8090

# ─── Express Server ─────────────────────────────
NODE_ENV=production
CORS_ORIGIN=https://rwr.yourdomain.com

# ─── PostgreSQL ────────────────────────────────
POSTGRES_USER=rwr_user
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=rwr_db

# ─── Client (Vite 빌드 시 주입) ──────────────────
VITE_KAKAO_MAP_KEY=your_kakao_api_key_here
```

`docker-compose.yml`은 루트의 `.env` 파일을 자동으로 읽으므로 (`env_file`이나 `${VAR}` 문법 모두 지원) 별도 설정 없이 변수를 참조한다.

---

## 4. 변경 파일 목록

| 구분 | 파일                           | 변경 내용                           |
| ---- | ------------------------------ | ----------------------------------- |
| 신규 | `.env.example` (루트)          | 모든 서비스 환경변수 통합 예제      |
| 수정 | `docker-compose.yml`           | 포트 변경, 환경변수 외부화          |
| 신규 | `.github/workflows/deploy.yml` | GitHub Actions CI/CD 워크플로우     |
| 참고 | `server/.env.example`          | 개발 시 참고용으로 유지 (변경 없음) |
| 참고 | `client/.env.example`          | 개발 시 참고용으로 유지 (변경 없음) |

---

## 5. docker-compose.yml 수정 계획

### 변경 전 → 후

| 항목         | 변경 전                       | 변경 후                                                           |
| ------------ | ----------------------------- | ----------------------------------------------------------------- |
| nginx 포트   | `"80:80"`                     | `"${NGINX_PORT:-8090}:80"`                                        |
| DB 유저      | `rwr_user` (하드코딩)         | `${POSTGRES_USER}`                                                |
| DB 비밀번호  | `rwr_password` (하드코딩)     | `${POSTGRES_PASSWORD}`                                            |
| DB 이름      | `rwr_db` (하드코딩)           | `${POSTGRES_DB}`                                                  |
| DATABASE_URL | 하드코딩 전체 URL             | `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${POSTGRES_DB}` 조합 |
| CORS_ORIGIN  | `http://localhost` (하드코딩) | `${CORS_ORIGIN}`                                                  |

---

## 6. GitHub Actions 워크플로우 설계

### 트리거

- `main` 브랜치 push 시 자동 배포

### 흐름

```
push to main
  └─ self-hosted runner (VM)
       ├─ 코드 체크아웃
       ├─ GitHub Secrets → 루트 .env 파일 생성
       ├─ docker compose up -d --build
       └─ 배포 완료
```

### GitHub Secrets 등록 필요 항목

| Secret 이름          | 값 예시                        |
| -------------------- | ------------------------------ |
| `NGINX_PORT`         | `8090`                         |
| `NODE_ENV`           | `production`                   |
| `CORS_ORIGIN`        | `https://rwr.yourdomain.com`   |
| `POSTGRES_USER`      | `rwr_user`                     |
| `POSTGRES_PASSWORD`  | 강력한 비밀번호                |
| `POSTGRES_DB`        | `rwr_db`                       |
| `VITE_KAKAO_MAP_KEY` | 카카오맵 API 키 (없으면 빈 값) |

---

## 7. VM 초기 배포 가이드 (One-time Setup)

### 7.1 VM에 Docker 설치 확인

```bash
docker --version
docker compose version
```

### 7.2 GitHub Actions self-hosted runner 설치

1. GitHub 저장소 → Settings → Actions → Runners → New self-hosted runner
2. OS: Linux, Architecture: x64 선택
3. GitHub이 제시하는 설치 명령어 순서대로 실행
4. 서비스 등록 (VM 재시작 후 자동 실행):

```bash
sudo ./svc.sh install
sudo ./svc.sh start
```

5. **docker 그룹 추가 후 반드시 Runner 서비스 재시작**:

```bash
sudo usermod -aG docker $USER
# ⚠️ 아래 재시작을 빠뜨리면 Runner 프로세스가 구 세션 상태로 실행되어
# docker 명령에서 Permission denied 에러가 발생한다
sudo ./svc.sh stop
sudo ./svc.sh start
```

### 7.3 Cloudflare Tunnel 설정 (기존 tunnel 활용)

이미 cloudflared가 VM에 설치되어 있다면 기존 tunnel에 서브도메인만 추가한다.

```bash
# Cloudflare Zero Trust Dashboard에서:
# Networks → Tunnels → 기존 Tunnel 클릭 → Public Hostname 추가
# Subdomain: rwr
# Domain: yourdomain.com
# Type: HTTP
# URL: localhost:8090
```

또는 cloudflared CLI로:

```bash
cloudflared tunnel route dns <TUNNEL_ID> rwr.yourdomain.com
```

`~/.cloudflared/config.yml`에 ingress 규칙 추가:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/<user>/.cloudflared/<TUNNEL_ID>.json

ingress:
  # 기존 서비스 규칙 유지
  - hostname: health.yourdomain.com
    service: http://localhost:3000
  # RWR 추가
  - hostname: rwr.yourdomain.com
    service: http://localhost:8090
  # catch-all (필수)
  - service: http_status:404
```

cloudflared 재시작:

```bash
sudo systemctl restart cloudflared
```

### 7.4 최초 배포 실행

```bash
# VM에서 프로젝트 클론 (최초 1회)
git clone https://github.com/yellow-pang/RWR-mini-project.git
cd RWR-mini-project

# .env 파일 수동 생성 (최초 1회 / 이후는 GitHub Actions가 생성)
cp .env.example .env
nano .env   # 실제 값으로 수정

# 빌드 및 실행
docker compose up -d --build
```

---

## 8. 완료 기준

- [ ] `docker compose up -d --build`로 8090 포트에서 SPA + API 정상 동작
- [ ] `https://rwr.yourdomain.com` 접속 시 Cloudflare Tunnel 경유 정상 응답
- [ ] GitHub `main` 브랜치에 push 시 VM에서 자동 재배포
- [ ] DB 비밀번호가 코드에 하드코딩되지 않음 (`.env` 미추적)
- [ ] 기존 health-center 서비스와 포트 충돌 없음

---

## 9. 주의사항

- `docker compose up -d --build` 실행 시 기존 DB 볼륨(`rwr-mini-project_postgres_data`)은 유지된다. 초기 데이터(schema, seed)는 볼륨이 **없을 때만** 자동 실행된다.
- GitHub Actions self-hosted runner를 실행하는 OS 유저가 `docker` 그룹에 속해 있어야 한다: `sudo usermod -aG docker $USER`
- `.env` 파일은 절대 git에 커밋하지 않는다 (`.gitignore`에 이미 포함되어 있음).
