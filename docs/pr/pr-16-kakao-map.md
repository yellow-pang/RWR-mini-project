# PR #16. 카카오맵 SDK 연동

> 관련 작업 계획서: [docs/plans/plan-16-kakao-map.md](../plans/plan-16-kakao-map.md)
> 관련 Step 문서: [docs/steps/step-16-kakao-map.md](../steps/step-16-kakao-map.md)

---

## 브랜치 정보

| 항목        | 값               |
| ----------- | ---------------- |
| 작업 브랜치 | `feat/kakao-map` |
| 병합 대상   | `dev`            |
| 상태        | 진행 중          |

---

## PR 제목

```text
[Step 16] 카카오맵 SDK 연동으로 코스 시작점 지도 표시
```

---

## 개요

정적 SVG 플레이스홀더(`MapPreview`)를 카카오맵 SDK 기반 실제 지도(`MapView`)로 교체했다.  
`courses` 테이블에 `start_lat`, `start_lng` 컬럼을 추가하고, 10개 코스에 서울 실제 좌표를 입력했다.

---

## 변경 사항

| 구분 | 파일                                   | 내용                                               |
| ---- | -------------------------------------- | -------------------------------------------------- |
| 수정 | `server/src/db/schema.sql`             | `courses` 테이블에 `start_lat`, `start_lng` 컬럼 추가 |
| 수정 | `server/src/db/seed.sql`               | 10개 코스 서울 실제 좌표 추가                      |
| 수정 | `server/src/services/coursesService.js` | `COURSE_COLUMNS`에 `start_lat`, `start_lng` 포함   |
| 수정 | `client/index.html`                    | 카카오맵 JavaScript SDK 스크립트 로드              |
| 신규 | `client/src/components/MapView.jsx`    | 카카오맵 실제 렌더링 컴포넌트 (SVG fallback 포함)  |
| 신규 | `client/src/components/MapView.css`    | MapView 컨테이너 스타일                            |
| 수정 | `client/src/components/CourseCard.jsx` | `MapPreview` → `MapView` 교체 (compact 모드)       |
| 수정 | `client/src/pages/DetailPage.jsx`      | `MapPreview` → `MapView` 교체 (전체 모드)          |

---

## 변경 이유

MVP 요구사항(`03-requirements.md`) 중 "지도 API 연동 (마커 표시) — ✅ 필수 MVP" 항목을 충족하기 위해 구현했다.  
카카오 JavaScript API 키 발급 및 도메인 등록(`http://localhost:5173`, `https://rwr.healthq.store`)이 완료된 시점에 진행했다.

---

## 동작 설명

- **ResultPage 카드**: `MapView compact` 모드 — 축소 지도(레벨 4), 인포윈도우 없음
- **DetailPage**: `MapView` 전체 모드 — 레벨 3 지도, 코스명 인포윈도우 표시
- **Fallback**: `start_lat`/`start_lng`가 null이거나 SDK 미로드 시 기존 SVG(`MapPreview`) 렌더링

---

## 주의사항

- `VITE_KAKAO_MAP_KEY`는 빌드 시 번들에 포함되므로 공개 노출 주의 (개발/운영 키 분리 권장)
- VM 최초 배포 또는 볼륨 재생성 시 `schema.sql`이 새 컬럼 포함 버전으로 자동 실행됨
- 기존 볼륨이 살아있는 VM에서는 **`docker compose down -v` 후 재배포** 필요
