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
| 현재 상태 | 검증 통과, 사용자 병합 확인 대기 |
| 운영 영향 | 병합 후 새 main SHA의 GHCR 게시와 Mac mini 자동 배포 시작 |

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
