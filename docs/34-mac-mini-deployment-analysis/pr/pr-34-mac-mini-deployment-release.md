# PR #42. Mac mini GHCR pull 자동 배포 활성화

> 관련 계획서: [Mac mini 배포 전환 Master Plan](../plans/plan-34-mac-mini-ghcr-deployment.md)
>
> 관련 Step 문서: [Phase 3](../steps/step-34-phase-3-mac-pull-deployment.md)

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 기준 브랜치 | `dev` |
| 병합 대상 | `main` |
| PR | [#42](https://github.com/yellow-pang/RWR-mini-project/pull/42) |
| 현재 상태 | main 병합 및 최초 Mac 자동 배포 성공 |
| merge commit | `040f02d2bc90742a92633ee1468bacbfe4ed5c75` |
| 운영 영향 | GHCR 게시 뒤 Mac mini가 같은 SHA image를 자동 pull/up |

## 배경

Phase 2는 GitHub Actions에서 web/server 멀티 아키텍처 image를 만들고 GHCR에 게시하도록 build 책임을 옮겼다. Phase 3은 Mac mini가 그 결과물을 고정 운영 경로에서 pull/up하고 실패 시 직전 SHA로 돌아가도록 구현했다.

PR #42는 `dev`에서 검증한 Phase 3 변경을 `main`에 반영하는 release PR이다. 병합 전 고정 운영 경로, 기존 runtime `.env` 직접 참조, OrbStack production stack과 Mac self-hosted runner를 먼저 준비했다. 따라서 병합된 main push부터 publish와 deploy가 한 workflow로 이어진다.

## 병합 전 완료한 준비

- `/Users/tro/services/rwr`에 release와 current/previous 상태를 유지한다.
- runtime `.env`는 `/Users/tro/dev/RWR-mini-project/.env`를 직접 참조하며 복사하지 않는다.
- 기존 main SHA image를 production Compose로 실행해 API/UI health를 확인했다.
- 공식 macOS ARM64 runner `2.337.0`을 checksum 검증 후 등록했다.
- `rwr-mac-mini`를 LaunchAgent로 실행하고 GitHub online 상태를 확인했다.
- repository variable `RWR_DEPLOY_DIR`, `RWR_ENV_FILE`과 GitHub Environment `production`을 준비했다.
- PR #42의 애플리케이션 검증이 통과했다.

## 병합 후 연결되는 흐름

```text
main merge SHA
→ GitHub-hosted validate
→ GHCR web/server amd64·arm64 image 게시
→ rwr-mac-mini runner
→ /Users/tro/services/rwr/releases/<SHA>
→ OrbStack docker compose pull/up
→ API/UI health
→ 성공 SHA 기록 또는 직전 SHA rollback
```

## 기존 서비스 로직 영향

React, Express, PostgreSQL schema/seed와 코스·즐겨찾기·최근 이력 기능은 변경하지 않는다. Mac production의 application image 공급과 실행 방식만 서버 직접 build에서 GHCR SHA pull로 바뀐다.

Cloudflare Tunnel과 기존 Windows VM은 이 PR에서 변경하지 않는다. Mac nginx는 `127.0.0.1:8090`에만 열려 있으며 Phase 4 전까지 외부 트래픽을 받지 않는다.

## 병합 후 확인 항목

- validate, publish, deploy 세 job의 순차 성공
- production web/server image tag가 PR #42의 main merge SHA와 일치
- runner 작업 뒤에도 API health와 UI root가 정상 응답
- `.current-sha`와 `current` 링크가 새 SHA를 가리킴
- PostgreSQL named volume과 기존 데이터가 유지됨
- `/Users/tro/services/rwr`에 `.env`가 복사되지 않음

이 확인이 끝난 뒤 Phase 4 Cloudflare Tunnel 전환을 시작한다.

## 병합 및 자동 배포 결과

- PR #42를 main에 merge commit 방식으로 병합했다.
- workflow [35493924836](https://github.com/yellow-pang/RWR-mini-project/actions/runs/35493924836)의 validate, multi-platform publish, Mac deploy가 모두 성공했다.
- production current SHA와 web/server image tag가 merge commit과 일치한다.
- 기존 main SHA는 previous release와 image로 남아 rollback 한 세대를 보장한다.
- web, server, PostgreSQL은 모두 OrbStack에서 arm64 image로 실행된다.
- API health와 root UI가 정상이고 PostgreSQL seed 10건과 테이블이 유지된다.
- 고정 배포 경로에 `.env` 사본이 없으며 기존 runtime 파일을 계속 직접 참조한다.
- Cloudflare Tunnel과 기존 Windows VM은 변경하지 않았다.

Phase 3의 실제 자동 배포 연결은 완료됐다. 정상 production에 실패를 유도하는 rollback 검증과 Mac 재부팅 복구 확인은 별도 사용자 확인이 필요한 운영 검증으로 남긴다.
