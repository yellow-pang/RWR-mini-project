# Plan 16. 카카오맵 연동

> **작성일**: 2026.05.31  
> **브랜치**: `feat/kakao-map`  
> **관련 문서**: [01-overview.md](../01-overview.md) | [06-data-spec.md](../06-data-spec.md)  
> **이전 완료 단계**: [step-15-volume-naming.md](../steps/step-15-volume-naming.md)

---

## 1. 목표

현재 정적 SVG 플레이스홀더(`MapPreview.jsx`)를 카카오맵 SDK 기반 실제 지도로 교체한다.  
코스 시작점 좌표(start_lat, start_lng)를 DB에 추가하고, 지도 위 마커로 표시한다.

---

## 2. 배경 및 현재 상태

| 항목             | 현재                     | 목표                       |
| ---------------- | ------------------------ | -------------------------- |
| `MapPreview.jsx` | 정적 SVG 아트            | 카카오맵 SDK 실제 지도     |
| `courses` 테이블 | start_lat/start_lng 없음 | NUMERIC(9,6) 컬럼 추가     |
| 환경 변수        | 없음                     | `VITE_KAKAO_MAP_KEY`       |
| index.html       | 외부 스크립트 없음       | 카카오맵 SDK 스크립트 로드 |

---

## 3. 변경 파일 목록

| 구분         | 파일                                   | 설명                               |
| ------------ | -------------------------------------- | ---------------------------------- |
| 🔴 DB 변경   | `server/src/db/schema.sql`             | `start_lat`, `start_lng` 컬럼 추가 |
| 🔴 DB 변경   | `server/src/db/seed.sql`               | 10개 코스 실제 좌표 추가           |
| 🟡 환경 변수 | `.env` (사용자 직접 수정)              | `VITE_KAKAO_MAP_KEY=...` 추가      |
| 🟡 환경 변수 | `docker-compose.dev.yml`               | `VITE_KAKAO_MAP_KEY` 전달          |
| 🟢 신규      | `client/src/components/MapView.jsx`    | 카카오맵 실제 렌더링 컴포넌트      |
| 🟢 신규      | `client/src/components/MapView.css`    | MapView 스타일                     |
| 🟢 수정      | `client/index.html`                    | 카카오맵 SDK 스크립트 로드         |
| 🟢 수정      | `client/src/pages/ResultPage.jsx`      | MapPreview → MapView 교체          |
| 🟢 수정      | `client/src/pages/DetailPage.jsx`      | MapPreview → MapView 교체          |
| 🟢 수정      | `client/src/components/MapPreview.jsx` | 삭제 또는 fallback용으로 유지      |

---

## 4. 상세 설계

### 4.1 DB 스키마 변경 (사용자 확인 필요)

```sql
-- schema.sql에 추가
ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS start_lat NUMERIC(9,6),
  ADD COLUMN IF NOT EXISTS start_lng NUMERIC(9,6);
```

> Docker DB는 컨테이너 재생성 시 schema.sql이 재실행되므로,  
> 기존 볼륨이 있으면 수동 ALTER 또는 `docker compose down -v` 후 재시작 필요.

### 4.2 seed.sql 좌표 데이터

| route     | 코스명               | start_lat | start_lng |
| --------- | -------------------- | --------- | --------- |
| route-001 | 서울숲 둘레길        | 37.5447   | 127.0374  |
| route-002 | 한강 반포 구간       | 37.5125   | 126.9996  |
| route-003 | 북악산 자락길        | 37.5872   | 126.9785  |
| route-004 | 여의도 한강공원 순환 | 37.5285   | 126.9343  |
| route-005 | 월드컵공원 노을길    | 37.5702   | 126.8911  |
| route-006 | 남산 순환 산책로     | 37.5514   | 126.9888  |
| route-007 | 청계천 산책길        | 37.5694   | 126.9783  |
| route-008 | 올림픽공원 들길      | 37.5195   | 127.1223  |
| route-009 | 뚝섬 한강공원 코스   | 37.5286   | 127.0535  |
| route-010 | 수락산 입구 둘레길   | 37.6735   | 127.0753  |

### 4.3 카카오맵 SDK 로드 (index.html)

```html
<!-- 카카오맵 JavaScript SDK (autoload=false) -->
<script
  type="text/javascript"
  src="//dapi.kakao.com/v2/maps/sdk.js?appkey=%VITE_KAKAO_MAP_KEY%&autoload=false"
></script>
```

> Vite에서는 `import.meta.env.VITE_KAKAO_MAP_KEY`로 접근.  
> index.html에서 `%VITE_KAKAO_MAP_KEY%`는 Vite가 빌드 시 자동 치환.

### 4.4 MapView.jsx 설계

```
props:
  - lat: Number (코스 시작점 위도)
  - lng: Number (코스 시작점 경도)
  - compact: Boolean (축소 모드, ResultPage용)
  - title: String (마커 인포윈도우 텍스트)

동작:
  1. window.kakao.maps 존재 여부 확인
  2. kakao.maps.load() 콜백 내에서 Map 인스턴스 생성
  3. 시작점에 Marker 배치
  4. InfoWindow로 코스명 표시 (compact 모드에서는 생략)
  5. lat/lng가 null이면 MapPreview(SVG fallback) 렌더링

에러 처리:
  - API 키 미설정 시 SVG fallback
  - SDK 로드 실패 시 SVG fallback
```

### 4.5 환경 변수

```bash
# .env (클라이언트 루트)
VITE_KAKAO_MAP_KEY=발급받은_JavaScript_앱_키

# docker-compose.dev.yml args 섹션에도 추가 필요
```

---

## 5. 카카오 개발자 센터 API 키 발급 절차

1. https://developers.kakao.com 접속
2. 내 애플리케이션 → 애플리케이션 추가
3. 앱 이름: `RWR-dev` (임의)
4. **앱 키 → JavaScript 키** 복사 (지도 API에는 JavaScript 키 사용)
5. 플랫폼 → Web 사이트 도메인 등록
   - 개발: `http://localhost:5173`
   - 배포: VM IP or 도메인

---

## 6. 구현 순서 (사용자 승인 후 진행)

```
1. [사용자] 카카오 JavaScript 키 발급 및 공유
2. [사용자] schema.sql, seed.sql 변경 승인
3. schema.sql — start_lat, start_lng 컬럼 추가
4. seed.sql — UPDATE 구문으로 좌표 추가
5. client/.env — VITE_KAKAO_MAP_KEY 추가 안내
6. client/index.html — SDK 스크립트 태그 추가
7. MapView.jsx + MapView.css 신규 작성
8. ResultPage.jsx — MapView compact 모드 적용
9. DetailPage.jsx — MapView full 모드 적용
10. lint + build 검증
11. docker compose up --build 검증
12. Step/PR 문서 작성
```

---

## 7. 검증 항목

| 항목                  | 확인 방법                        |
| --------------------- | -------------------------------- |
| 카카오맵 SDK 로드     | 브라우저 콘솔에 오류 없음        |
| 지도 마커 렌더링      | DetailPage에서 시작점 마커 표시  |
| compact 모드          | ResultPage 카드에 축소 지도 표시 |
| lat/lng null fallback | SVG 플레이스홀더로 대체 렌더링   |
| API 키 미설정         | SVG 플레이스홀더로 대체 렌더링   |
| lint 오류 없음        | `npm.cmd run lint` 통과          |
| build 성공            | `npm.cmd run build` 통과         |

---

## 8. 주의사항

- `schema.sql`은 Docker 최초 기동 시에만 실행됨 → 기존 볼륨 있으면 수동 마이그레이션 필요
- 카카오맵 JavaScript 키는 **도메인 등록 필수** (미등록 시 지도 로드 실패)
- `VITE_KAKAO_MAP_KEY`는 빌드 결과물에 포함되므로 퍼블릭 노출 주의 (개발용 키 구분 권장)
