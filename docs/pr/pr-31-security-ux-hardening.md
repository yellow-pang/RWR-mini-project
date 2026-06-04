# PR #31. 보안 안정화와 UX 고도화 방향 정리

> 관련 작업 계획서: [docs/plans/plan-31-security-ux-hardening.md](../plans/plan-31-security-ux-hardening.md)  
> 관련 Step 문서: [docs/steps/step-31-security-ux-hardening.md](../steps/step-31-security-ux-hardening.md)

---

## 브랜치 정보

| 항목 | 값 |
| ---- | -- |
| 작업 브랜치 | `dev` |
| 병합 대상 | `dev` |
| 상태 | 문서화 완료 |

---

## PR 제목

```text
[Step 31] 보안 안정화와 UX 고도화 방향 정리
```

---

## 개요

Step 30까지 구현된 주소 기반 생성형 코스 기능을 기준으로, 다음 단계에서 필요한 보안 안정화와 UX 고도화 방향을 정리한다.

이번 PR 문서는 코드 변경이 아니라 문서 추가를 요약한다. `plan`, `step`, `pr` 번호를 모두 31번으로 맞춰 후속 작업 추적을 쉽게 하는 것이 목적이다.

---

## 변경 파일 목록

| 구분 | 파일 | 변경 내용 |
| ---- | ---- | --------- |
| 신규 | `docs/plans/plan-31-security-ux-hardening.md` | 보안/UX 후속 고도화 계획과 우선순위 정리 |
| 신규 | `docs/steps/step-31-security-ux-hardening.md` | 문서화 Step 완료 기록 |
| 신규 | `docs/pr/pr-31-security-ux-hardening.md` | PR 요약 문서 작성 |

---

## 정리한 주요 내용

### 보안 안정화

- `express-rate-limit` 기반 API rate limit 필요성 정리
- `/api/routes/*`, `/api/locations/*` 같은 외부 API 의존 경로의 별도 제한 필요성 정리
- ORS, Kakao Local 요청 timeout 필요성 정리
- geocode, reverse-geocode, POI search 30초 메모리 캐싱 방향 정리
- 서버 로그에 주소 원문, 좌표, 요청 body 전체가 남지 않도록 하는 기준 정리
- 요청 body limit은 "10kb 이하, 현재 기본 4kb" 기준으로 정리할 것을 제안

### Cloudflare / Nginx

- Cloudflare HTTPS 적용 방향 정리
- API 경로별 Cloudflare rate limit 방향 정리
- 테스트 환경 Cloudflare Access 보호 필요성 정리
- Nginx `client_max_body_size`, proxy timeout, `limit_req` 보완 후보 정리

### UX 고도화

- 결과 지도에서 출발지 인지 강화
- 겹치는 경로의 방향 표시 강화
- 자동 생성 경로의 거리/정확도 한계 안내
- 실패 시 다음 행동을 안내하는 재시도 UX
- 중간 지점 직접 선택, 관광형 코스, AI 주변 정보, 색상 커스텀을 후순위 확장으로 분류

---

## 후속 작업 제안

이번 문서화 Step을 31번으로 사용했으므로, 실제 구현은 32번부터 이어가는 것을 권장한다.

```text
feat/step-32-api-security-hardening
feat/step-33-map-direction-ux
feat/step-34-route-error-retry-ux
```

권장 순서:

```text
1. API 보안 안정화
2. 지도 출발지/방향 UX 개선
3. 실패 대응과 재시도 UX 개선
4. 관광형/AI/색상 커스텀 같은 경험 확장
```

---

## 검증

이번 변경은 문서 추가만 포함한다.

| 항목 | 결과 |
| ---- | ---- |
| 코드 변경 | 없음 |
| npm 패키지 변경 | 없음 |
| DB / Docker / 환경변수 변경 | 없음 |
| 문서 번호 정합성 | `plan-31`, `step-31`, `pr-31` 생성 |

---

## 후속 확인

- 실제 보안 구현 Step 번호를 32번부터 시작할지 확정
- `express-rate-limit` 패키지 추가 승인
- timeout 기본값과 환경변수 사용 여부 결정
- Cloudflare 운영 설정 체크리스트를 별도 문서로 분리할지 결정
