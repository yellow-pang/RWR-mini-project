# Step 13. VM 배포 환경 구성

> 작성일: 2026.05.31
> 브랜치: `feat/vm-deployment-setup` 권장
> 작업 계획서: [docs/plans/plan-13-vm-deployment.md](../plans/plan-13-vm-deployment.md)

---

## 1. 작업 목표

Ubuntu 24.04 VM에 Cloudflare Tunnel + GitHub Actions self-hosted runner를 이용해 RWR 프로젝트의 운영 배포 환경을 구성한다.

- 기존 `health-center` 서비스(포트 3000, 8080, 5432 등)와 충돌 없이 격리된 포트(`8090`) 사용
- DB 인증정보 등 민감한 값을 코드에서 분리, GitHub Secrets로 관리
- `main` 브랜치 push 시 VM에서 자동 재빌드·재배포

---

## 2. 변경 내용

| 구분 | 파일                                  | 설명                                                  |
| ---- | ------------------------------------- | ----------------------------------------------------- |
| 신규 | `.env.example` (루트)                 | 모든 서비스 환경변수 통합 예제                        |
| 수정 | `docker-compose.yml`                  | 포트 외부화, DB 인증정보 `${VAR}` 외부화              |
| 수정 | `.github/workflows/deploy.yml`        | GHCR+SSH 방식 → self-hosted runner 방식으로 전면 교체 |
| 수정 | `docs/plans/plan-13-vm-deployment.md` | 7.2 Runner 재시작 주의사항 추가                       |

---

## 3. 주요 변경 상세

### 3.1 `docker-compose.yml`

| 항목         | 변경 전                       | 변경 후                                                           |
| ------------ | ----------------------------- | ----------------------------------------------------------------- |
| nginx 포트   | `"80:80"`                     | `"${NGINX_PORT:-8090}:80"`                                        |
| DB 유저      | `rwr_user` (하드코딩)         | `${POSTGRES_USER}`                                                |
| DB 비밀번호  | `rwr_password` (하드코딩)     | `${POSTGRES_PASSWORD}`                                            |
| DB 이름      | `rwr_db` (하드코딩)           | `${POSTGRES_DB}`                                                  |
| DATABASE_URL | 전체 하드코딩 URL             | `${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${POSTGRES_DB}` 조합 |
| CORS_ORIGIN  | `http://localhost` (하드코딩) | `${CORS_ORIGIN}`                                                  |

### 3.2 `.github/workflows/deploy.yml`

기존 워크플로우(GitHub-hosted runner → GHCR 빌드 → SSH 배포)를 self-hosted runner 방식으로 교체했다.

**변경 전 흐름:**

```
push to main
  └─ GitHub-hosted runner
       ├─ GHCR 이미지 빌드·푸시
       └─ SSH → VM docker compose pull
```

**변경 후 흐름:**

```
push to main
  └─ self-hosted runner (VM에서 직접 실행)
       ├─ 코드 체크아웃
       ├─ GitHub Secrets → 루트 .env 생성 (printf 방식, 특수문자 안전)
       ├─ docker compose up -d --build
       ├─ Health check (http://localhost:8090, 최대 30초)
       └─ docker image prune -f
```

GHCR 토큰, VM_HOST, VM_SSH_KEY 등 SSH 관련 Secrets가 더 이상 필요 없다.

---

## 4. GitHub Secrets 등록 필요 항목

GitHub 저장소 → Settings → Secrets and variables → Actions → New repository secret

| Secret 이름          | 값                                              |
| -------------------- | ----------------------------------------------- |
| `NGINX_PORT`         | `8090`                                          |
| `NODE_ENV`           | `production`                                    |
| `CORS_ORIGIN`        | `https://rwr.yourdomain.com`                    |
| `POSTGRES_USER`      | `rwr_user`                                      |
| `POSTGRES_PASSWORD`  | 강력한 비밀번호 (영문+숫자 권장, `$` 기호 제외) |
| `POSTGRES_DB`        | `rwr_db`                                        |
| `VITE_KAKAO_MAP_KEY` | 카카오맵 API 키 (없으면 빈 값)                  |

---

## 5. VM 초기 셋업 순서 (최초 1회)

### 5.1 self-hosted runner 설치

```bash
# GitHub 저장소 → Settings → Actions → Runners → New self-hosted runner
# OS: Linux / Architecture: x64 선택 후 GitHub 제시 명령어 실행
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L <GitHub 제시 URL>
tar xzf ./actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/yellow-pang/RWR-mini-project --token <TOKEN>

# 서비스 등록
sudo ./svc.sh install
sudo ./svc.sh start

# docker 그룹 추가 후 반드시 Runner 서비스 재시작
sudo usermod -aG docker $USER
sudo ./svc.sh stop
sudo ./svc.sh start
```

### 5.2 Cloudflare Tunnel 서브도메인 추가

Cloudflare Zero Trust Dashboard → Networks → Tunnels → 기존 Tunnel → Public Hostname 추가:

| 항목      | 값               |
| --------- | ---------------- |
| Subdomain | `rwr`            |
| Domain    | `yourdomain.com` |
| Type      | HTTP             |
| URL       | `localhost:8090` |

### 5.3 최초 배포 (runner 설치 전 또는 수동 확인용)

```bash
git clone https://github.com/yellow-pang/RWR-mini-project.git
cd RWR-mini-project
cp .env.example .env
nano .env   # 실제 값으로 수정
docker compose up -d --build
```

---

## 6. 검증 결과

| 검증 항목                                 | 결과      |
| ----------------------------------------- | --------- |
| `.env.example` 루트 통합                  | 완료      |
| `docker-compose.yml` 포트 8090 외부화     | 완료      |
| `docker-compose.yml` DB 인증정보 외부화   | 완료      |
| `deploy.yml` self-hosted runner 방식 전환 | 완료      |
| healthcheck `$$VAR` 이스케이프            | 완료      |
| `.env` `.gitignore` 포함 확인             | 기존 유지 |
