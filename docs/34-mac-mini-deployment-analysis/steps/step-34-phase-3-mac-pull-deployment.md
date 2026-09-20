# Step 34. Phase 3 Mac 고정 경로 pull 배포

- 작성일: 2026-09-20
- 브랜치: `feat/34-mac-mini-pull-deployment`
- 범위: GHCR SHA image 전용 Compose, 고정 경로 배포 및 rollback script, main 전용 Mac deploy job
- 구현 판정: **저장소 구현 및 실제 OrbStack pull/up 검증 통과**
- 자동화 판정: **대기 — Mac self-hosted runner 등록과 고정 운영 경로 전환 필요**

## 1. 이 Phase가 필요한 이유

기존 Windows VM은 self-hosted runner의 `_work` checkout 안에서 `docker compose up -d --build`를 실행했다. CI 임시 디렉터리가 운영 경로가 되고, 서버가 application image를 직접 build하며, checkout 정리와 build cache가 운영 상태에 영향을 주는 구조였다.

Phase 3은 GitHub에서 이미 검증하고 게시한 commit SHA image만 Mac mini가 소비하도록 역할을 바꾼다.

```text
main 검증 및 image 게시 성공
→ Mac mini self-hosted runner
→ 고정 경로에 release 파일 복사
→ GHCR commit SHA image pull
→ OrbStack docker compose up
→ localhost API/UI health 확인
→ 성공 SHA 기록 또는 직전 SHA rollback
```

Cloudflare는 아직 연결하지 않는다. localhost 배포가 독립적으로 재현된 뒤 외부 경로를 연결해야 애플리케이션 문제와 Tunnel 문제를 구분할 수 있기 때문이다.

## 2. 구현 내용

### `docker-compose.deploy.yml`

- `rwr-web`과 `rwr-server`는 `RWR_IMAGE_TAG`로 전달된 40자리 commit SHA image를 사용한다.
- `build` 설정이 없으므로 Mac에서 application image를 만들지 않는다.
- Compose project는 `rwr-production`, network는 `rwr-production-network`, PostgreSQL volume은 `rwr-production-postgres-data`로 고정한다.
- nginx만 `127.0.0.1:${NGINX_PORT}:80`으로 publish한다.
- server 3000과 PostgreSQL 5432는 host에 publish하지 않는다.
- schema와 seed는 SHA별 release directory의 파일을 새 volume 초기화에 사용한다.

### `scripts/deploy-mac.sh`

- 인자로 commit SHA, 고정 배포 경로, workflow checkout 원본 경로, 기존 runtime `.env` 경로를 받는다.
- SHA 형식, 전달된 `.env`와 필수 환경변수 이름, Compose/schema/seed 파일을 먼저 검증한다.
- `.env`는 고정 배포 경로나 workflow checkout으로 복사하지 않는다.
- release 파일을 `${DEPLOY_DIR}/releases/${SHA}`에 복사한다.
- `docker compose pull` 후 `up -d --remove-orphans`만 실행한다.
- nginx publish port의 `/api/health`와 `/`가 모두 응답해야 성공으로 기록한다.
- 실패하면 `.current-sha`의 직전 release를 다시 실행하고 배포 job을 실패로 끝낸다.
- 성공하면 `.current-sha`, `.previous-sha`, `current`, `previous` 링크를 갱신한다.
- 현재와 직전 SHA의 release/image만 남기며 `rwr-web`, `rwr-server`의 더 오래된 SHA tag만 선택적으로 정리한다. 다른 프로젝트 image와 PostgreSQL image/volume은 정리하지 않는다.

### GitHub Actions deploy job

- main push의 `publish` 성공 뒤에만 실행한다.
- runner label은 `self-hosted`, `macOS`, `ARM64`, `rwr-production`이다.
- GitHub Environment `production`을 사용한다.
- repository variable `RWR_DEPLOY_DIR`의 고정 경로와 `RWR_ENV_FILE`의 기존 runtime 파일 경로를 script에 전달한다.
- GHCR package가 공개 pull 가능한 상태여서 Mac에 별도 registry credential을 저장하지 않는다.
- checkout은 release 파일 공급원일 뿐이다. runtime `.env`는 기존 위치에 남고 상태 파일과 volume만 고정 운영 경로에 유지한다.

## 3. RED→GREEN 배포 계약 검증

형식적인 파일 존재 테스트 대신 실제 배포 계약을 shell/Ruby 테스트로 고정했다.

| 계약 | RED | GREEN |
| --- | --- | --- |
| SHA image, build 없음, nginx loopback, 고정 volume | 운영 Compose가 없어 config 실패 | `docker compose config --format json` 구조 검증 통과 |
| pull/up, current/previous SHA 기록 | 배포 script 부재 | 가짜 Docker 경계에서 두 번의 순차 배포 통과 |
| health 실패 rollback | 복구 동작 부재 | 실패 SHA 후 직전 SHA 재실행 및 current marker 유지 |
| 현재/직전 image만 보관 | 오래된 release 유지 | RWR 두 image의 오래된 SHA만 정리 |
| main publish 후 Mac deploy | deploy job 부재 | runner label, production environment, SHA/고정 경로 전달 검증 통과 |

테스트는 실제 Docker 구현을 흉내 내는 대신 script가 호출하는 Docker 경계와 상태 파일을 기록한다. 실제 image·DB·API 계약은 아래 OrbStack 검증에서 별도로 확인했다.

## 4. 실제 GHCR → OrbStack 검증

main merge commit `8d244f8cf0497b4db26d38b46cfead62b57dac6c`의 공개 image를 인증 없이 pull했다. 기존 Phase 0/1 project와 충돌하지 않도록 임시 검증 경로와 port 8092를 사용했으며, repository `.env` 값은 출력하거나 수정하지 않았다.

| 검증 | 결과 |
| --- | --- |
| `rwr-web`, `rwr-server`, `postgres:16-alpine` pull | 통과 |
| 세 container architecture | 모두 `arm64` |
| 실행 image tag | web/server 모두 main merge commit SHA와 일치 |
| nginx host port | `127.0.0.1:8092`만 publish |
| server/DB host port | publish 없음 |
| PostgreSQL volume | `rwr-production-postgres-data` 신규 생성 |
| DB 초기화 | `courses`, `favorites`, `history`, seed course 10건 확인 |
| API | health, 저장 코스, 랜덤 코스, 즐겨찾기 생성/조회/삭제 통과 |
| 외부 API | Kakao geocode와 ORS 주소 기반 순환 코스 통과 |
| UI | `/`와 `/favorites` nginx SPA 응답 200 |
| 같은 SHA 재배포 | container 재사용, DB healthy, API/UI health 통과 |

nginx container가 시작된 직후 첫 health 요청은 빈 응답이었고 script 재시도에서 정상 통과했다. 이 결과로 startup 직후 단일 요청만 사용하는 대신 제한된 health 재시도가 필요하다는 점도 확인됐다.

실제 rollback은 다음 SHA image가 게시된 뒤 현재/직전 두 release가 존재할 때 재검증한다. 이번 구현에서는 가짜 Docker 경계를 사용해 health 실패, 직전 SHA 재실행, marker 유지 계약을 검증했다.

## 5. 자동화 범위와 사용자 확인 범위

| 구분 | 내용 | 이유 |
| --- | --- | --- |
| 자동화 | main SHA image pull, release 복사, Compose up, health, rollback | 반복 배포를 동일한 순서로 재현하기 위해 |
| 자동화 | 현재/직전 RWR SHA image 정리 | Mac disk 누적을 제한하면서 rollback 한 세대를 보장하기 위해 |
| 유지 | 기존 Phase 0/1 container와 volume | 이전 방식과 새 image 방식 비교 근거를 남기기 위해 |
| 사용자 확인 | `/Users/tro/services/rwr` 생성 | repository 밖에 실제 운영 release와 상태를 만들기 때문에 |
| 사용자 확인 | Mac self-hosted runner 등록 및 자동 시작 | GitHub workflow가 Mac에서 명령을 실행할 수 있는 지속 권한이 생기기 때문에 |
| 사용자 확인 | Phase 3 workflow를 main에 병합 | 이후 main push마다 Mac 자동 배포가 실행되기 때문에 |

## 6. 현재 운영 영향과 남은 항목

- 임시 `rwr-production` project는 localhost 8092에서 실행 중이며 외부 Cloudflare 트래픽에는 연결되지 않았다.
- 기존 Windows VM container, runner, volume, Tunnel은 변경하거나 삭제하지 않았다.
- GHCR package는 공개 pull 가능하므로 Mac runner에 package token을 저장하지 않는다.
- repository variable `RWR_DEPLOY_DIR=/Users/tro/services/rwr`와 GitHub Environment `production`을 생성했다. `RWR_ENV_FILE`에는 값이 아닌 기존 `.env`의 로컬 경로만 등록한다. Environment에는 현재 별도 승인 규칙이 없고 workflow의 main push 조건이 배포 경계를 담당한다.
- 고정 운영 경로와 runner가 준비되기 전에는 Phase 3 workflow를 main에 반영하지 않는다.
- runner 등록 후 같은 SHA 재배포, 다음 SHA 배포, 실제 rollback, Mac 재부팅 뒤 OrbStack/runner/container 복구를 확인해야 한다.
- 위 항목이 통과해야 Phase 4 Cloudflare 전환을 시작한다.
