# Mac mini 배포 이전 검토 문서

- 작성일: 2026-09-19
- 작업 브랜치: `chore/34-mac-mini-deployment-analysis`
- 분석 기준: `a430afe71822fe42db2732a51b298623558b7080`
- 시작 브랜치: `dev`. 사용자 후속 지시에 따라 `chore/34-mac-mini-deployment-analysis`를 생성하고 체크아웃했다.
- 문서 위치: `docs/34-mac-mini-deployment-analysis/`. 최초 분석 문서 작성 시에는 코드와 배포 설정을 변경하지 않았다.
- Phase 0에서 현재 Compose의 Mac mini + OrbStack 재현 검증을 실행했다. 저장소 설정, `.env`, Cloudflare는 변경하지 않았다.
- Phase 1에서 Docker build context를 제한하고 Node.js 24 기반 arm64 이미지의 build, 실행, DB/API/UI 회귀 검증을 완료했다. `.env`와 Cloudflare는 변경하지 않았다.
- Phase 2에서 GitHub-hosted CI와 GHCR 멀티 아키텍처 게시 workflow를 구현했다. PR/dev 검증과 main 최초 게시에 성공했고, web/server의 SHA·main 태그와 amd64/arm64 manifest를 확인했다.
- Phase 3에서 GHCR SHA image 전용 운영 Compose, Mac 고정 경로 배포 script, main 게시 후 실행할 self-hosted deploy job을 구현 중이다. 공개 GHCR image의 실제 OrbStack pull/up과 DB/API/UI 계약은 통과했고 runner 등록과 고정 운영 경로 전환이 남아 있다.
- 2026-09-20 Phase 3 운영 준비 보정: `/Users/tro/services/rwr` 고정 경로 배포와 `rwr-mac-mini` runner의 LaunchAgent 등록을 완료했다. runtime `.env`는 복사하지 않고 기존 `/Users/tro/dev/RWR-mini-project/.env`를 직접 참조한다. PR #42 검증까지 통과했으며 main 병합과 최초 자동 배포 확인이 남아 있다.
- 2026-09-20 Phase 3 자동 배포 보정: PR #42를 main에 병합한 뒤 workflow `35493924836`의 validate, GHCR publish, Mac deploy가 모두 성공했다. production은 merge SHA `040f02d2bc90742a92633ee1468bacbfe4ed5c75`의 arm64 image를 실행하며 직전 SHA를 rollback 세대로 보존한다. 실제 실패 유도 rollback과 Mac 재부팅 복구 검증은 남아 있다.
- 2026-09-20 환경 정리 보정: 검증용 `rwr-phase0`, `rwr-phase1` container/network를 제거하고 두 PostgreSQL volume은 보존했다. 같은 OrbStack에서 `health-center`, `smartdrain-mac` 이전 작업이 진행 중이므로 Mac 재부팅과 공유 Cloudflare 변경은 두 작업과 조율할 때까지 보류한다.
- 2026-09-20 Cloudflare 조율 보정: Health Center의 공통 운영 문서가 정한 Mac host의 remotely-managed Tunnel 1개와 프로젝트별 localhost route 방식을 공통 기준으로 채택한다. Cloudflare 변경 소유권은 해당 세션 하나에 두고 RWR 세션은 `127.0.0.1:8090` origin 정보와 검증 결과만 인계한다.

## 폴더 구조

```text
34-mac-mini-deployment-analysis/
├── README.md
├── analysis/
│   └── 01-current-deployment.md
├── plans/
│   └── plan-34-mac-mini-ghcr-deployment.md
├── steps/
│   ├── step-34-phase-0-compose-reproduction.md
│   ├── step-34-phase-1-docker-runtime.md
│   ├── step-34-phase-2-ci-ghcr.md
│   └── step-34-phase-3-mac-pull-deployment.md
└── pr/
    ├── pr-34-mac-mini-ghcr-foundation.md
    ├── pr-34-mac-mini-pull-deployment.md
    └── pr-34-mac-mini-deployment-release.md
```

- [현재 배포 분석](analysis/01-current-deployment.md)
- [Mac mini 배포 전환 Master Plan](plans/plan-34-mac-mini-ghcr-deployment.md)
- [Phase 0 Compose 재현 검증](steps/step-34-phase-0-compose-reproduction.md)
- [Phase 1 Docker build context와 Node runtime 정비](steps/step-34-phase-1-docker-runtime.md)
- [Phase 2 GitHub CI와 GHCR 이미지 게시 준비](steps/step-34-phase-2-ci-ghcr.md)
- [Phase 3 Mac 고정 경로 pull 배포](steps/step-34-phase-3-mac-pull-deployment.md)
- [PR #37 Mac mini 이전 검증 및 GHCR 배포 기반 구성](pr/pr-34-mac-mini-ghcr-foundation.md)
- [PR #40 Mac mini GHCR pull 배포 자동화](pr/pr-34-mac-mini-pull-deployment.md)
- [PR #42 Mac mini GHCR pull 자동 배포 활성화](pr/pr-34-mac-mini-deployment-release.md)

기존 `docs/plans`, `docs/steps`, `docs/pr` 기록은 옮기거나 삭제하지 않는다. 이번 브랜치의 후속 Plan/Step/PR은 사용자 요청으로 준비한 작업별 하위 폴더에 작성한다. Phase 0은 Mac Compose 재현, Phase 1은 Docker runtime 정비, Phase 2는 GitHub-hosted CI와 GHCR 게시 준비를 담당한다. Phase 2의 PR 및 `dev` 원격 실행 결과는 Step 문서의 보정 기록에 남겼고, 최초 main publish 결과도 같은 문서에 이어서 기록한다. 다른 프로젝트의 폴더 구조는 제공되지 않아 저장소의 기존 분류를 참고했다.
