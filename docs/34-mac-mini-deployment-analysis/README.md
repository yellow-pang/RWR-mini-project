# Mac mini 배포 이전 검토 문서

- 작성일: 2026-09-19
- 작업 브랜치: `chore/34-mac-mini-deployment-analysis`
- 분석 기준: `a430afe71822fe42db2732a51b298623558b7080`
- 시작 브랜치: `dev`. 사용자 후속 지시에 따라 `chore/34-mac-mini-deployment-analysis`를 생성하고 체크아웃했다.
- 문서 위치: `docs/34-mac-mini-deployment-analysis/`. 코드와 배포 설정은 변경하지 않았다.
- 현재 범위는 분석과 Plan 문서 작성까지다. 구현, 배포, Cloudflare 변경은 하지 않는다.

## 폴더 구조

```text
34-mac-mini-deployment-analysis/
├── README.md
├── analysis/
│   └── 01-current-deployment.md
├── plans/     # 향후 계획 문서용 빈 자리
├── steps/     # 향후 구현 완료 문서용 빈 자리
└── pr/        # 향후 PR 문서용 빈 자리
```

- [현재 배포 분석](analysis/01-current-deployment.md)
- [Mac mini 배포 전환 Master Plan](plans/plan-34-mac-mini-ghcr-deployment.md)

기존 `docs/plans`, `docs/steps`, `docs/pr` 기록은 옮기거나 삭제하지 않는다. 이번 브랜치의 후속 Plan/Step/PR은 사용자 요청으로 준비한 작업별 하위 폴더에 작성한다. 현재는 Plan만 작성했고 Step/PR 문서는 구현 완료 후 추가한다. 다른 프로젝트의 폴더 구조는 제공되지 않아 저장소의 기존 분류를 참고했다.
