# Step 34. Phase 2 GitHub CI와 GHCR 이미지 게시 준비

- 작성일: 2026-09-20
- 브랜치: `chore/34-mac-mini-deployment-analysis`
- 범위: GitHub-hosted CI, GHCR 멀티 아키텍처 image publish, 기존 VM workflow 자동 실행 중지
- 로컬 판정: **구현과 정적·멀티 아키텍처 build 검증 통과**
- 원격 판정: **확인 필요 — 아직 commit/push하지 않아 GitHub Actions와 GHCR은 실행되지 않음**

## 1. 변경 목적

기존 `deploy.yml`은 main push 때 Linux VM의 self-hosted runner가 checkout 디렉터리에서 직접 `.env`를 만들고 `docker compose up -d --build`를 실행했다. Phase 2는 build 책임을 GitHub-hosted runner로 옮겨 다음 흐름을 만든다.

```text
PR 또는 dev push
→ validate 1회
→ image publish 없음

main push
→ validate 1회
→ validate 성공
→ rwr-web, rwr-server multi-platform build
→ GHCR에 commit SHA와 main tag 게시
```

Mac mini pull/up 배포와 Cloudflare 변경은 Phase 3~4 범위이므로 추가하지 않았다.

## 2. GitHub Actions 구성

새 `.github/workflows/pipeline.yml`은 다음 두 job으로 구성된다.

### validate

- runner: `ubuntu-latest`
- Node.js: 24
- server: lockfile 설치 후 전체 JavaScript 문법 검사
- client: lockfile 설치 후 lint와 production build
- PR과 dev/main push에서 한 번만 실행

### publish

- 실행 조건: `push` 이벤트이면서 `refs/heads/main`
- 선행 조건: `validate` 성공
- 인증: repository의 `GITHUB_TOKEN`
- 권한: `contents: read`, `packages: write`
- 플랫폼: `linux/amd64`, `linux/arm64`
- image:
  - `ghcr.io/${repository_owner}/rwr-web:${GITHUB_SHA}`
  - `ghcr.io/${repository_owner}/rwr-web:main`
  - `ghcr.io/${repository_owner}/rwr-server:${GITHUB_SHA}`
  - `ghcr.io/${repository_owner}/rwr-server:main`
- cache: image별 GitHub Actions cache scope 분리

현재 origin owner인 `yellow-pang`은 이미 소문자여서 GHCR image namespace 조건을 만족한다.

workflow action major version은 2026-09-20 공식 문서를 기준으로 `actions/checkout@v7`, `actions/setup-node@v7`, Docker setup/login action v4, `docker/build-push-action@v7`을 사용한다.

## 3. 환경변수와 비밀값 경계

publish job이 받는 repository secret은 `VITE_KAKAO_MAP_KEY` 하나다. 이 값은 Vite build 결과에 포함되는 브라우저용 JavaScript SDK key다.

다음 runtime 값은 workflow, Docker build context, GHCR image에 전달하지 않는다.

- `ENV_FILE`
- `ORS_API_KEY`
- `KAKAO_REST_API_KEY`
- `POSTGRES_PASSWORD`
- Mac mini의 `.env`

`.env.example`도 GHCR build와 runtime `.env`의 역할이 다름을 설명하도록 보정했다. 기존 VM workflow를 수동으로 실행하는 동안에는 기존 `ENV_FILE` secret이 계속 필요하다.

## 4. 기존 VM workflow 처리

`.github/workflows/deploy.yml`은 아직 삭제하지 않았다. workflow 이름을 `Legacy VM Deploy (manual)`로 바꾸고 trigger를 `workflow_dispatch`만 남겼다.

따라서 main push가 발생해도 기존 self-hosted runner의 직접 build/up은 자동 실행되지 않는다. GHCR 게시 검증이 끝나기 전 긴급 비교가 필요하면 GitHub UI에서 명시적으로 수동 실행할 수 있다.

## 5. 로컬 검증 결과

| 검증 | 결과 |
| --- | --- |
| Ruby YAML parser로 두 workflow 구문 확인 | 통과 |
| actionlint 1.7.12 | 통과, 오류와 경고 없음 |
| 자동 pipeline에서 `ENV_FILE`과 server/DB secret 참조 없음 | 통과 |
| server `linux/amd64,linux/arm64` cache-only build | 통과 |
| web `linux/amd64,linux/arm64` cache-only build | 통과 |
| GHCR push | 실행하지 않음 |

actionlint binary는 공식 release의 macOS arm64 archive를 `/private/tmp`에 내려받아 공개 SHA-256과 일치하는지 확인한 뒤 사용했다. 저장소에는 도구 파일을 추가하지 않았다.

두 multi-platform 검증 build는 `type=cacheonly` output을 사용했다. 따라서 amd64/arm64 build 단계는 실제 수행했지만 local registry나 GHCR에 tag 또는 manifest를 게시하지 않았다.

## 6. commit/push 이후 확인할 항목

Phase 2의 최종 완료 판정에는 GitHub 외부 상태 확인이 필요하다.

1. repository Actions secret `VITE_KAKAO_MAP_KEY` 존재 여부와 값 갱신
2. PR에서 validate가 정확히 한 번 실행되고 publish가 skip되는지 확인
3. dev push에서 validate만 정확히 한 번 실행되는지 확인
4. main push에서 validate 성공 후 publish가 실행되는지 확인
5. `rwr-web`과 `rwr-server` package에 전체 commit SHA와 `main` tag가 생성되는지 확인
6. 두 SHA tag manifest에 `linux/amd64`, `linux/arm64`가 모두 존재하는지 확인
7. package visibility와 Mac mini pull 인증 방식을 Phase 3 전에 결정

현재 Mac의 `gh` CLI에는 `yellow-pang` 계정이 선택돼 있지만 저장된 token이 유효하지 않아 Secret 이름을 원격 조회하지 못했다. 값은 조회하거나 출력하지 않았다. 원격 검증 전 `gh auth login -h github.com` 재인증 또는 GitHub 웹 설정 확인이 필요하다.

위 항목이 확인되기 전에는 Phase 2를 원격 완료로 판정하거나 기존 VM workflow를 제거하지 않는다.

## 7. 이번 Phase에서 제외한 항목

- Mac mini self-hosted runner 설치와 label 설정
- GHCR image를 사용하는 운영 Compose
- Mac 고정 배포 경로와 pull/up script
- rollback과 image 정리
- Cloudflare Tunnel 생성 또는 route 변경
- 기존 VM runner, container, volume, secret 삭제
- npm audit 의존성 업그레이드
