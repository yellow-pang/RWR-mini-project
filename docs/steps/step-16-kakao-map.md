# Step 16. 카카오맵 SDK 연동

> 작성일: 2026.05.31
> 브랜치: `feat/kakao-map`
> 작업 계획서: [docs/plans/plan-16-kakao-map.md](../plans/plan-16-kakao-map.md)
> 관련 PR 문서: [docs/pr/pr-16-kakao-map.md](../pr/pr-16-kakao-map.md)

---

## 1. 작업 목표

정적 SVG 플레이스홀더(`MapPreview.jsx`)를 카카오맵 SDK 기반 실제 지도(`MapView.jsx`)로 교체한다.  
`courses` 테이블에 `start_lat`, `start_lng` 컬럼을 추가하고, 10개 코스에 서울 실제 좌표를 입력한다.

---

## 2. 변경 내용

| 구분 | 파일                                    | 설명                                                  |
| ---- | --------------------------------------- | ----------------------------------------------------- |
| 수정 | `server/src/db/schema.sql`              | `courses` 테이블에 `start_lat`, `start_lng` 컬럼 추가 |
| 수정 | `server/src/db/seed.sql`                | 10개 코스 서울 실제 좌표 추가                         |
| 수정 | `server/src/services/coursesService.js` | `COURSE_COLUMNS`에 `start_lat`, `start_lng` 포함      |
| 수정 | `client/index.html`                     | 카카오맵 JavaScript SDK 스크립트 로드                 |
| 신규 | `client/src/components/MapView.jsx`     | 카카오맵 실제 렌더링 컴포넌트 (SVG fallback 포함)     |
| 신규 | `client/src/components/MapView.css`     | MapView 컨테이너 스타일                               |
| 수정 | `client/src/components/CourseCard.jsx`  | `MapPreview` → `MapView` 교체 (compact 모드)          |
| 수정 | `client/src/pages/DetailPage.jsx`       | `MapPreview` → `MapView` 교체 (전체 모드)             |

---

## 3. 변경 상세

### 3.1 DB 스키마 변경

```sql
-- schema.sql
CREATE TABLE IF NOT EXISTS courses (
  ...
  start_lat    NUMERIC(9,6),   -- 추가: 코스 시작점 위도 (nullable)
  start_lng    NUMERIC(9,6),   -- 추가: 코스 시작점 경도 (nullable)
  created_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);
```

### 3.2 seed.sql 좌표 추가 (일부 발췌)

```sql
-- 컬럼 목록에 start_lat, start_lng 포함
INSERT INTO courses (id, title, ..., start_lat, start_lng) VALUES
  ('route-001', '서울숲 둘레길', ..., 37.544700, 127.037400),
  ('route-002', '한강 반포 구간', ..., 37.512500, 126.999600),
  ...
```

### 3.3 카카오맵 SDK 로드 (index.html)

```html
<script
  type="text/javascript"
  src="//dapi.kakao.com/v2/maps/sdk.js?appkey=%VITE_KAKAO_MAP_KEY%&autoload=false"
></script>
```

> `%VITE_KAKAO_MAP_KEY%` — Vite 빌드 시 환경변수 값으로 자동 치환

### 3.4 MapView.jsx 핵심 로직

```jsx
// SDK 이용 가능 여부를 마운트 시점에 1회 평가
const [sdkFailed] = useState(() => !window.kakao?.maps);

useEffect(() => {
  if (!hasCoords || sdkFailed) return;
  window.kakao.maps.load(() => {
    const map = new window.kakao.maps.Map(containerRef.current, {
      center,
      level,
    });
    new window.kakao.maps.Marker({ map, position: center });
    // compact=false 이면 InfoWindow(코스명)도 표시
  });
}, [lat, lng, title, compact, hasCoords, sdkFailed]);

// lat/lng 없거나 SDK 실패 시 SVG fallback
if (!hasCoords || sdkFailed) return <MapPreview compact={compact} />;
```

### 3.5 등록 도메인

| 환경 | 도메인                      |
| ---- | --------------------------- |
| 개발 | `http://localhost:5173`     |
| 운영 | `https://rwr.healthq.store` |

---

## 4. 검증 결과

| 검증 항목                                    | 결과                      |
| -------------------------------------------- | ------------------------- |
| `npm run lint`                               | ✅ 통과                   |
| `npm run build`                              | ✅ 통과 (dist 55 modules) |
| `start_lat`/`start_lng` null 시 SVG fallback | ✅ 확인                   |
| SDK 미로드 시 SVG fallback                   | ✅ 확인                   |

---

## 5. 배포 시 주의사항

기존 VM 볼륨(`rwr_postgres_data`)이 존재하는 경우 schema.sql이 재실행되지 않으므로,  
**배포 전 VM에서 아래 명령을 먼저 실행**해야 새 컬럼이 적용된다.

```bash
cd ~/path/to/RWR-mini-project
docker compose down -v
# 이후 git push → CI/CD가 up --build 하면서 새 schema로 초기화됨
```
