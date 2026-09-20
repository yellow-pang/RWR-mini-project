# Mac mini 배포 이전 검토 문서

- 작성일: 2026-09-19
- 작업 브랜치: `chore/34-mac-mini-deployment-analysis`
- 분석 기준: `a430afe71822fe42db2732a51b298623558b7080`
- 시작 브랜치: `dev`. 사용자 후속 지시에 따라 `chore/34-mac-mini-deployment-analysis`를 생성하고 체크아웃했다.
- 문서 위치: `docs/34-mac-mini-deployment-analysis/`. 코드와 배포 설정은 변경하지 않았다.
- Phase 0에서 현재 Compose의 Mac mini + OrbStack 재현 검증을 실행했다. 저장소 설정, `.env`, Cloudflare는 변경하지 않았다.

## 폴더 구조

```text
34-mac-mini-deployment-analysis/
├── README.md
├── analysis/
│   └── 01-current-deployment.md
├── plans/
│   └── plan-34-mac-mini-ghcr-deployment.md
├── steps/
│   └── step-34-phase-0-compose-reproduction.md
└── pr/        # 향후 PR 문서용 빈 자리
```

- [현재 배포 분석](analysis/01-current-deployment.md)
- [Mac mini 배포 전환 Master Plan](plans/plan-34-mac-mini-ghcr-deployment.md)
- [Phase 0 Compose 재현 검증](steps/step-34-phase-0-compose-reproduction.md)

기존 `docs/plans`, `docs/steps`, `docs/pr` 기록은 옮기거나 삭제하지 않는다. 이번 브랜치의 후속 Plan/Step/PR은 사용자 요청으로 준비한 작업별 하위 폴더에 작성한다. Phase 0은 인프라·DB·API를 재현했고, localhost 환경 차이와 지도 SDK 실패 시 발생하던 UI blocker를 확인해 최소 수정한 뒤 주소 기반 순환 코스까지 검증했다. 다른 프로젝트의 폴더 구조는 제공되지 않아 저장소의 기존 분류를 참고했다.
