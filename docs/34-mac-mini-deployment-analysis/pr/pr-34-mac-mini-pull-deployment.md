# PR 준비. Mac mini GHCR pull 배포 자동화

> 관련 계획서: [Mac mini 배포 전환 Master Plan](../plans/plan-34-mac-mini-ghcr-deployment.md)
>
> 관련 Step 문서: [Phase 2](../steps/step-34-phase-2-ci-ghcr.md) | [Phase 3](../steps/step-34-phase-3-mac-pull-deployment.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `feat/34-mac-mini-pull-deployment` |
| 병합 대상 | `dev` |
| 범위 | 운영 Compose, 배포/rollback script, main 전용 Mac deploy job, Phase 2~3 기록 |

## PR 제목

```text
[Step 34] Mac mini GHCR pull 배포 자동화
```

## 배경

Phase 2에서 main commit의 web/server image를 GHCR에 게시하고 amd64/arm64 manifest를 확인했다. 다음 단계는 Mac mini가 소스 checkout에서 image를 다시 build하지 않고, 게시가 끝난 정확한 commit SHA image를 고정 경로에서 실행하도록 만드는 것이다.

기존 Windows VM의 self-hosted runner는 `_work` checkout을 운영 디렉터리로 사용했다. 새 구조는 checkout을 release 파일 공급원으로만 사용하고 runtime `.env`, PostgreSQL volume, 현재/직전 SHA 상태를 `/Users/tro/services/rwr`에 유지한다.

## 선택한 방식

- local build용 `docker-compose.yml`은 Phase 0/1 비교용으로 유지한다.
- 별도 `docker-compose.deploy.yml`은 GHCR SHA image만 사용하고 `build`를 정의하지 않는다.
- Compose project, network, PostgreSQL volume 이름을 고정해 checkout 경로와 분리한다.
- nginx만 loopback에 공개하고 server와 DB는 Docker network 안에 둔다.
- 배포 script가 SHA 검증, release 복사, pull/up, API/UI health, rollback, 두 세대 정리를 담당한다.
- deploy job은 main publish 성공 후 `rwr-production` label의 Mac runner에서만 실행한다.
- GHCR package가 공개 pull 가능하므로 Mac에 장기 package credential을 저장하지 않는다.

## 변경 파일과 역할

| 파일 | 역할 | 서비스 영향 |
| --- | --- | --- |
| `docker-compose.deploy.yml` | GHCR SHA image와 고정 volume/network 정의 | Mac이 image를 build하지 않고 pull해 실행 |
| `scripts/deploy-mac.sh` | 고정 경로 release, health, rollback, image 정리 | 실패한 SHA를 현재 상태로 기록하지 않음 |
| `scripts/tests/deploy-mac.test.sh` | pull/up, 상태 기록, 실패와 rollback 계약 | 배포 실패 경로의 회귀 방지 |
| `scripts/tests/workflow-deploy.test.rb` | main/publish/runner/경로 workflow 계약 | PR/dev 또는 잘못된 runner 배포 방지 |
| `.github/workflows/pipeline.yml` | publish 뒤 Mac deploy job 추가 | main에 반영된 이후 자동 pull/up 시작 |
| `.github/actionlint.yaml` | custom runner label과 variable 선언 | workflow 정적 검증 정확도 유지 |
| `.env.example` | 고정 runtime `.env`와 build-time key 경계 설명 | 환경변수 값과 이름은 변경하지 않음 |
| `docs/34-mac-mini-deployment-analysis/` | Phase 2 완료와 Phase 3 근거·결과 기록 | Windows VM→Mac 이전 판단 보존 |

## 적용 후 흐름

```text
main push
→ GitHub-hosted validate
→ web/server amd64·arm64 image publish
→ Mac self-hosted runner
→ /Users/tro/services/rwr/releases/<SHA> 준비
→ docker compose pull/up
→ localhost /api/health와 UI 확인
→ 성공: current/previous 갱신
→ 실패: 직전 SHA로 rollback 후 job 실패
```

## 기존 서비스 로직 영향

React, Express, DB schema/seed, API 응답, 코스·즐겨찾기·이력 로직은 변경하지 않는다. 배포 방식만 source build에서 GHCR SHA pull로 바뀐다. Cloudflare Tunnel과 외부 hostname은 이 PR에서 변경하지 않는다.

새 PostgreSQL volume은 기존 정책대로 schema와 seed로 초기화된다. 기존 Windows VM DB 데이터는 이관하지 않는다.

## 검증 결과

| 검증 | 결과 |
| --- | --- |
| 배포 Compose에 `build` 없음 | 통과 |
| web/server commit SHA image 강제 | 통과 |
| nginx loopback, server/DB host port 없음 | 통과 |
| 잘못된 SHA와 필수 `.env` 검증 | 통과 |
| image pull 실패 시 container 교체 없음 | 통과 |
| 순차 배포 current/previous 기록 | 통과 |
| health 실패 시 직전 SHA rollback | 통과 |
| deploy와 rollback이 모두 실패한 상태 구분 | 통과 |
| 현재/직전 RWR image만 정리 | 통과 |
| workflow actionlint 및 custom label | 통과 |
| 실제 공개 GHCR SHA를 OrbStack arm64에 pull/up | 통과 |
| 새 DB 테이블 3개와 seed 10건 | 통과 |
| API, 즐겨찾기 CRUD, Kakao geocode, ORS route | 통과 |
| root UI와 SPA fallback | 통과 |
| 같은 SHA 실제 재배포 | 통과 |

실제 검증 project는 localhost 8092에서 실행 중이며 Cloudflare와 연결되지 않았다. 기존 Phase 0/1과 Windows VM 자원은 유지했다.

## 외부 설정과 병합 전 조건

- repository variable `RWR_DEPLOY_DIR=/Users/tro/services/rwr` 등록 완료
- GitHub Environment `production` 생성 완료
- Mac self-hosted runner 등록 전
- `/Users/tro/services/rwr/.env` 배치 전
- 고정 운영 경로 실제 배포 전

runner는 GitHub workflow가 Mac에서 지속적으로 명령을 실행하는 권한이므로 사용자가 최종 승인한 뒤 등록한다. runner와 고정 경로가 준비되기 전에는 이 PR을 main에 승격하지 않는다.

## 리뷰 요청 사항

- pull 실패와 health 실패가 현재 정상 배포 marker를 바꾸지 않는지
- rollback이 실패했을 때 성공으로 오인할 수 없는지
- 정리 대상이 RWR의 오래된 SHA release와 두 image로 제한되는지
- workflow가 main push와 publish 성공 뒤 지정 Mac runner에서만 실행되는지
- runtime `.env`가 checkout이나 GHCR image에 포함되지 않는지
