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
  src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=%VITE_KAKAO_MAP_KEY%&autoload=false"
></script>
```

> ⚠️ `//`(protocol-relative) 로 작성하면 `http://localhost` 환경에서 `http://dapi.kakao.com`으로 해석되어 브라우저 ORB 정책에 의해 차단된다. 반드시 `https://` 명시.

> `%VITE_KAKAO_MAP_KEY%` — Vite 빌드 시 환경변수 값으로 자동 치환

### 3.4 MapView.jsx 핵심 로직

```jsx
// window.kakao 존재 여부만 확인
// (autoload=false 시 kakao.maps는 load() 콜백 이후에 초기화되므로 kakao?.maps 체크 불가)
const [sdkFailed] = useState(() => !window.kakao);

useEffect(() => {
  if (!hasCoords || sdkFailed) return;
  window.kakao.maps.load(() => {
    const map = new window.kakao.maps.Map(containerRef.current, {
      center: new window.kakao.maps.LatLng(lat, lng),
      level: compact ? 4 : 3,
    });
    new window.kakao.maps.Marker({ map, position: center });
    // compact=false 이면 InfoWindow(코스명)도 표시
  });
}, [lat, lng, title, compact, hasCoords, sdkFailed]);

// lat/lng 없거나 SDK 실패 시 SVG fallback
if (!hasCoords || sdkFailed) return <MapPreview compact={compact} />;
```

> ⚠️ `autoload=false` 사용 시 `window.kakao.maps`는 `kakao.maps.load()` 콜백 실행 전까지 `undefined`이다. 따라서 **SDK 스크립트 로드 여부**만 판단하는 `!window.kakao`를 기준으로 삼아야 한다.

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

---

## 6. 디버깅 노트 (트러블슈팅)

> 이 섹션은 개발 중 발생한 버그와 해결 과정을 기록한다.

### 버그 1: `ERR_BLOCKED_BY_ORB` + 스크립트 로드 실패

**현상**  
브라우저 콘솔에 `ERR_BLOCKED_BY_ORB` 오류 발생. 카카오맵 스크립트가 로드되지 않고 SVG fallback만 표시.

**원인 분석**  
SDK URL을 `//dapi.kakao.com`(protocol-relative)으로 작성했을 때 `http://localhost:5173` 환경에서 `http://dapi.kakao.com`으로 해석됨.  
브라우저는 HTTPS 페이지에서 HTTP 리소스를 Mixed Content로 차단하며, Fetch/XHR은 ORB(Opaque Response Blocking) 정책으로 추가 차단함.

**해결**  
`index.html`의 SDK URL을 `https://dapi.kakao.com`으로 명시적 변경.

```diff
- src="//dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false"
+ src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false"
```

---

### 버그 2: URL 수정 후에도 403 Forbidden 반환

**현상**  
`https://` 수정 후에도 SDK 요청이 403으로 차단됨.  
PowerShell 직접 요청 결과:
```
Invoke-WebRequest -Uri "https://dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false"
→ 403 Forbidden (응답 본문 없음)
```

**원인 분석**  
카카오 개발자 센터 정책 변경: **2024년 12월 1일 이후 신규 생성 앱은 「내 애플리케이션 → 앱 설정」에서 사용할 API를 명시적으로 활성화해야 함**.  
「카카오 지도 (Kakao Map)」 API가 OFF 상태였음.

**해결**  
[카카오 Developers 콘솔](https://developers.kakao.com) → 내 애플리케이션 → 앱 설정 → 플랫폼/API 활성화 메뉴에서  
**「카카오 지도」 활성화 ON** 으로 변경.

> 도메인 등록(localhost:5173, rwr.healthq.store)은 정상이었음. API 활성화 여부와 도메인 등록은 별개 설정.

---

### 버그 3: `sdkFailed` 로직 오탐 (SDK 로드되어도 fallback 표시)

**현상**  
403이 해결되어 SDK 스크립트가 정상 로드된 후에도 지도 대신 SVG fallback이 표시됨.

**원인 분석**  
`autoload=false` 방식에서 SDK 스크립트 로드 직후 상태:
- `window.kakao` → ✅ 존재
- `window.kakao.maps` → ❌ `undefined` (아직 초기화 안 됨)
- `window.kakao.maps.*` → `kakao.maps.load()` 콜백 실행 후에야 사용 가능

초기 코드에서 `!window.kakao?.maps`를 평가하면 SDK가 정상 로드된 상태에서도 `true`가 되어 `sdkFailed=true`로 고정됨.

```jsx
// ❌ 잘못된 코드 - autoload=false 시 항상 true (maps 객체 미초기화)
const [sdkFailed] = useState(() => !window.kakao?.maps);

// ✅ 수정된 코드 - SDK 스크립트 로드 여부만 판별
const [sdkFailed] = useState(() => !window.kakao);
```

**해결**  
`!window.kakao?.maps` → `!window.kakao`로 변경. SDK 스크립트 로드 완료 여부(window.kakao 존재)만 판별하고, 실제 maps 객체 접근은 `kakao.maps.load()` 콜백 내에서만 수행.

---

### 교훈 요약

| # | 문제 | 핵심 원인 | 해결 |
|---|------|-----------|------|
| 1 | ERR_BLOCKED_BY_ORB | `//` protocol-relative → HTTP 해석 | `https://` 명시 |
| 2 | 403 Forbidden | 카카오 API 활성화 OFF (2024.12 정책 변경) | 콘솔에서 API 활성화 |
| 3 | SDK 로드 후에도 SVG fallback | `autoload=false` 특성 무시한 `kakao?.maps` 체크 | `!window.kakao`로 변경 |

---

## 7. Notion 디버깅 노트 (복사용)

아래 블록을 그대로 Notion에 붙여넣으면 됩니다.

```markdown
# 🗺️ 카카오맵 SDK 연동 디버깅 노트

> 프로젝트: RWR-mini-project
> 날짜: 2026.05.31
> 키워드: 카카오맵, autoload=false, 403, ORB, sdkFailed

---

## 문제 1: ERR_BLOCKED_BY_ORB

### 현상
- 브라우저 콘솔에 `ERR_BLOCKED_BY_ORB` 출력
- 카카오맵 스크립트 로드 실패 → SVG fallback만 표시

### 원인
`index.html`에서 SDK URL을 `//dapi.kakao.com`(protocol-relative)으로 작성함.
`http://localhost:5173` 환경에서 `http://dapi.kakao.com`으로 해석 → ORB 차단.

### 해결
```html
<!-- 변경 전 -->
<script src="//dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false"></script>

<!-- 변경 후 -->
<script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=...&autoload=false"></script>
```

---

## 문제 2: 403 Forbidden

### 현상
`https://` 수정 후에도 SDK 스크립트 요청에서 403 반환.
PowerShell, 브라우저 모두 동일하게 차단됨.

### 원인
**카카오 2024.12.01 정책 변경**: 신규 앱은 Kakao Developers 콘솔에서
사용할 API를 **명시적으로 활성화**해야 함.
→ 「카카오 지도 (Kakao Map)」 API가 OFF 상태였음.

### 해결
1. https://developers.kakao.com 접속
2. 내 애플리케이션 → 앱 선택 → 앱 설정
3. **「카카오 지도」 활성화 → ON**

> 💡 도메인 등록(플랫폼 설정)과 API 활성화는 별개 설정이다.
> 도메인이 등록되어 있어도 API가 OFF이면 403이 반환된다.

---

## 문제 3: SDK 로드 성공 후에도 SVG fallback 표시

### 현상
403이 해결되어 SDK 스크립트가 정상 로드되어도 지도 대신 SVG placeholder만 표시됨.

### 원인
`autoload=false` 방식의 특성을 코드에서 고려하지 않음.

| 시점 | `window.kakao` | `window.kakao.maps` |
|------|----------------|---------------------|
| SDK 스크립트 로드 직후 | ✅ 존재 | ❌ undefined |
| `kakao.maps.load()` 콜백 실행 후 | ✅ 존재 | ✅ 초기화됨 |

```jsx
// ❌ 잘못된 코드 - SDK 로드 직후 kakao.maps는 항상 undefined
const [sdkFailed] = useState(() => !window.kakao?.maps);
//                                             ^^^^^^
//                       autoload=false 시 항상 true → SVG fallback 고정

// ✅ 수정된 코드 - 스크립트 로드 여부만 판별
const [sdkFailed] = useState(() => !window.kakao);
//                                  ^^^^^^^^^^^
//                   window.kakao 존재 = 스크립트 로드 완료
//                   maps 객체는 kakao.maps.load() 콜백 내에서만 접근
```

### 해결
`!window.kakao?.maps` → `!window.kakao` 변경

---

## 정리

| 번호 | 증상 | 원인 | 해결 |
|------|------|------|------|
| 1 | ERR_BLOCKED_BY_ORB | protocol-relative URL → HTTP 해석 | `https://` 명시 |
| 2 | 403 Forbidden | 카카오 API 활성화 OFF | 콘솔에서 활성화 ON |
| 3 | SVG fallback 고착 | `autoload=false` 시 `kakao.maps` undefined인데 체크함 | `!window.kakao`로 변경 |

> 카카오맵 `autoload=false` 패턴 공식 흐름:
> 1. `<script src="https://dapi.kakao.com/.../sdk.js?autoload=false">` 로드
> 2. React 컴포넌트에서 `window.kakao` 존재 여부로 로드 판별
> 3. `kakao.maps.load(callback)` 호출
> 4. callback 내에서 `new kakao.maps.Map(...)` 등 API 사용
```
