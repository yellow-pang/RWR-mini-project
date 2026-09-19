# Mac mini 배포 이전 검토 문서

- 작성일: 2026-09-19
- 작업 브랜치: `chore/34-mac-mini-deployment-analysis`
- 분석 기준: `a430afe71822fe42db2732a51b298623558b7080`
- 시작 브랜치: `dev`. 사용자 후속 지시에 따라 `chore/34-mac-mini-deployment-analysis`를 생성하고 체크아웃했다.
- 문서 위치: `docs/34-mac-mini-deployment-analysis/`. 코드와 배포 설정은 변경하지 않았다.
- 이번 범위는 분석과 문서 구조 준비뿐이다. Plan, 구현, 배포, Cloudflare 변경은 하지 않는다.

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

[현재 배포 분석](analysis/01-current-deployment.md)

기존 `docs/plans`, `docs/steps`, `docs/pr` 기록은 옮기거나 삭제하지 않는다. 위 하위 폴더는 사용자 요청에 따른 구조 준비이며, 실제 후속 Plan/Step/PR의 저장 위치는 기존 AGENTS.md 규칙과 함께 다음 작업에서 확정한다. 현재 `.gitkeep` 외에 후속 문서는 작성하지 않았다. 다른 프로젝트의 폴더 구조는 제공되지 않아 저장소의 기존 분류를 참고했다.
