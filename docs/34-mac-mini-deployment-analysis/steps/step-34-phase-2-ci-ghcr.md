# Step 34. Phase 2 GitHub CI와 GHCR 이미지 게시 준비

- 작성일: 2026-09-20
- 브랜치: `chore/34-mac-mini-deployment-analysis`
- 범위: GitHub-hosted CI, GHCR 멀티 아키텍처 image publish, 기존 VM workflow 자동 실행 중지
- 로컬 판정: **구현과 정적·멀티 아키텍처 build 검증 통과**
- 원격 판정: **PR 및 dev 검증 통과 — PR #37 병합 완료, 두 실행에서 validate 성공과 publish 정상 skip. GHCR 게시는 main 반영 후 확인 필요**

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

## 6. 원격 진행 결과와 남은 확인 항목

Phase 2의 최종 완료 판정에는 GitHub 외부 상태 확인이 필요하다.

### 2026-09-20 PR #37 보정 기록

- 작업 브랜치 `chore/34-mac-mini-deployment-analysis`를 origin에 push했다.
- `dev`를 base로 [PR #37](https://github.com/yellow-pang/RWR-mini-project/pull/37)을 생성했다.
- `CI and Publish / Validate application (pull_request)`이 14초에 성공했다.
- `CI and Publish / Publish multi-platform images (pull_request)`는 조건식에 따라 정상적으로 skip됐다.
- 최종 PR은 7 commits, 18 changed files이며 base branch와 충돌이 없었다.
- PR 생성만으로 GHCR package나 image tag는 생성되지 않았다.

### 2026-09-20 dev 병합 및 Secret 등록 기록

- PR #37을 일반 merge 방식으로 `dev`에 병합했다.
- merge commit은 `0fcda57712012df5570d0b0aba67e4472b852bfb`이다.
- merge commit의 `CI and Publish / Validate application (push)`이 성공했다.
- 같은 실행의 `Publish multi-platform images`는 `dev` 조건에 따라 정상적으로 skip됐다.
- GitHub Actions의 기본 `GITHUB_TOKEN` 권한은 read지만 publish job 자체에 `packages: write`가 선언돼 있어 repository 기본 권한 변경은 필요하지 않았다.
- repository Actions Secret에는 기존 `ENV_FILE`만 있었고 `VITE_KAKAO_MAP_KEY`가 없었다.
- 로컬 `.env`의 `VITE_KAKAO_MAP_KEY`를 화면, 명령 인자, 도구 출력에 노출하지 않고 stdin으로 전달해 Actions Secret으로 등록했다.
- Secret은 이름과 등록 시각만 확인했으며 실제 값은 조회하거나 문서에 기록하지 않았다.

이 결과는 PR 검증과 image 게시를 분리한 설계가 실제 GitHub에서도 동작한다는 근거다. 코드 리뷰 단계에서 image를 매번 게시하지 않아 불필요한 registry 저장과 멀티 아키텍처 build 시간을 줄이고, 검증된 main commit만 배포 후보 image로 만든다.

현재 완료된 원격 확인:

1. PR에서 validate가 정확히 한 번 실행됨
2. PR에서 publish가 정상적으로 skip됨
3. PR #37이 `dev`에 merge commit으로 병합됨
4. dev push에서 validate가 정확히 한 번 실행됨
5. dev push에서 publish가 정상적으로 skip됨
6. repository Actions Secret `VITE_KAKAO_MAP_KEY` 등록 완료
7. publish job의 `packages: write` 권한 확인

아직 남은 원격 확인:

1. main push에서 validate 성공 후 publish가 실행되는지 확인
2. `rwr-web`과 `rwr-server` package에 전체 commit SHA와 `main` tag가 생성되는지 확인
3. 두 SHA tag manifest에 `linux/amd64`, `linux/arm64`가 모두 존재하는지 확인
4. package visibility와 Mac mini pull 인증 방식을 Phase 3 전에 결정

현재 Mac의 `gh` CLI는 `yellow-pang` 계정으로 정상 인증되어 원격 workflow와 Secret 이름을 확인할 수 있다. Secret 값 자체는 GitHub에서도 다시 조회할 수 없으며 이번 기록에도 남기지 않는다.

main publish와 image manifest를 확인하기 전에는 Phase 2를 원격 완료로 판정하거나 기존 VM workflow를 제거하지 않는다.

## 7. Windows VM에서 Mac mini로 이전할 때 이 Phase가 필요한 이유

### 기존 방식에서 생긴 운영 결합

기존 배포는 Windows 노트북 안의 Linux VM에 설치한 self-hosted runner가 GitHub Actions의 `_work` checkout 디렉터리를 운영 디렉터리처럼 사용했다. main push가 발생하면 같은 머신이 소스를 받고 image를 build하고 container를 교체했다.

이 구조에서는 CI 작업 공간 정리, runner 장애, host build cache와 image 누적이 곧 운영 장애 위험으로 연결된다. Apple Silicon Mac mini로 host가 바뀌면 amd64만 고려한 image가 실행되지 않을 가능성도 있다.

### 이번에 build와 deploy를 먼저 분리한 이유

Mac mini에 runner와 Cloudflare를 먼저 연결하면 application, image, runner, network 문제가 동시에 발생할 수 있다. 그래서 다음 순서로 위험을 분리했다.

```text
기존 Compose의 Mac arm64 재현
→ build context와 runtime 정비
→ GitHub에서 검증하고 multi-arch image를 만드는 경로 준비
→ Mac mini는 검증된 image를 pull하는 배포 대상으로 전환
→ 마지막에 Cloudflare 외부 경로 연결
```

Phase 2는 세 번째 단계다. 이 단계에서 Mac mini 운영 설정을 건드리지 않고도 CI와 image 생성 계약을 먼저 확인할 수 있다.

### 자동화한 작업과 사용자가 결정하는 작업

| 구분 | 작업 | 이유 |
| --- | --- | --- |
| 자동화 | PR/dev/main에서 server 문법, client lint/build 검증 | 동일한 검증을 개발자 PC와 서버에서 반복하지 않기 위해 |
| 자동화 | main commit의 web/server amd64·arm64 image build | Mac mini arm64와 기존 amd64 환경 양쪽에서 같은 commit을 실행하기 위해 |
| 자동화 | commit SHA와 main tag 부여 | 배포 버전을 고정하면서 최신 후보도 쉽게 식별하기 위해 |
| 자동화 | PR에서는 publish skip | 리뷰 중인 commit이 registry와 운영 후보에 섞이지 않게 하기 위해 |
| 사용자 확인 | PR #37 내용 검토와 생성 승인 | 저장소에 공식 변경 기록을 남기는 행위이기 때문에 |
| 사용자 확인 | PR 병합과 dev→main 반영 | branch 상태와 image 게시를 실제로 변경하기 때문에 |
| 사용자 확인 | `VITE_KAKAO_MAP_KEY` Secret 값 | 저장소 파일로 확인할 수 없는 외부 비밀값이기 때문에 |
| 사용자 결정 | GHCR package 공개 범위와 Mac pull 인증 | 운영 접근 방식과 credential 보관 방법을 결정해야 하기 때문에 |

### 기존 서비스에 미치는 현재 영향

- PR #37은 `dev`에 병합됐지만 아직 `main`에는 반영되지 않았다.
- PR 검증은 GitHub-hosted runner에서 실행됐고 기존 Windows VM runner를 사용하지 않았다.
- GHCR publish는 실행되지 않았고 Mac mini 자동 배포도 연결되지 않았다.
- 기존 Linux VM의 container, volume, runner, Cloudflare Tunnel은 삭제하거나 변경하지 않았다.
- 실제 main 반영 후에는 기존 `deploy.yml`의 자동 실행이 중지되고 GHCR image publish가 새 자동 동작이 된다.

### 다음 사용자 확인 지점

1. dev를 main에 반영해 최초 GHCR image를 게시할지 결정
2. main workflow와 GHCR manifest를 확인
3. GHCR package 공개 범위와 Mac mini pull 인증 방식을 결정
4. Phase 3의 Mac mini pull/up 구현을 시작

## 8. 이번 Phase에서 제외한 항목

- Mac mini self-hosted runner 설치와 label 설정
- GHCR image를 사용하는 운영 Compose
- Mac 고정 배포 경로와 pull/up script
- rollback과 image 정리
- Cloudflare Tunnel 생성 또는 route 변경
- 기존 VM runner, container, volume, secret 삭제
- npm audit 의존성 업그레이드
