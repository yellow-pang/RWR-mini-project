# PR #06. 예외 처리 및 보안 보완

> 관련 작업 계획서: [docs/plans/plan-06-error-security.md](../plans/plan-06-error-security.md)  
> 관련 Step 문서: [docs/steps/step-06-error-security.md](../steps/step-06-error-security.md)

---

## 브랜치 정보

| 항목 | 값 |
| --- | --- |
| 작업 브랜치 | `fix/step-06-error-security` |
| 병합 대상 | `main` |
| 상태 | 진행 중 |

---

## PR 제목

```text
[Step 06] 예외 처리 및 보안 보완
```

---

## 개요

Step 05 API 연동 이후 발생할 수 있는 실패 상황을 안정화했다. 프론트엔드에서는 API 오류 메시지를 공통 처리하고, 중복 즐겨찾기와 이력 저장 실패를 사용자 흐름을 깨지 않는 방식으로 처리한다. 백엔드에서는 CORS origin, 요청 body limit, 413/403 전역 오류 응답을 보완했다.

---

## 주요 변경 사항

| 구분 | 내용 |
| --- | --- |
| API 오류 처리 | `ApiError`, `getFriendlyErrorMessage` 추가 |
| 네트워크 오류 | fetch 실패 시 서버 연결 안내 메시지 반환 |
| UUID 안정화 | localStorage 실패 시 memory fallback 사용 |
| 중복 즐겨찾기 | 409 응답을 저장된 상태와 notice로 처리 |
| 이력 저장 실패 | 추천 결과 표시는 유지하고 notice만 표시 |
| CORS | `CORS_ORIGIN` 쉼표 구분 목록 지원 |
| 요청 크기 | `JSON_BODY_LIMIT` 환경 변수 지원, 413 응답 보완 |
| 전역 오류 | 내부 오류 상세를 클라이언트에 노출하지 않음 |
| 문구 복구 | 깨진 JSX/한글 문구를 정상 한국어로 복구 |

---

## 변경 파일 체크리스트

| 파일 | 확인 항목 |
| --- | --- |
| `client/src/api/client.js` | 공통 오류 처리와 friendly message helper |
| `client/src/utils/userId.js` | localStorage 실패 fallback |
| `client/src/utils/courseDisplay.js` | 서버 저장값 표시 라벨 변환 |
| `client/src/pages/HomePage.jsx` | 추천 실패/이력 저장 실패 분리 |
| `client/src/pages/ResultPage.jsx` | 409 중복 즐겨찾기 처리 |
| `client/src/pages/DetailPage.jsx` | 상세 조회 실패/중복 저장 처리 |
| `client/src/pages/FavoritesPage.jsx` | 목록/삭제 실패 메시지 |
| `client/src/pages/HistoryPage.jsx` | 이력 조회/즐겨찾기 실패 메시지 |
| `client/src/components/CourseCard.jsx` | 카드 문구 복구 |
| `client/src/components/CourseInfo.jsx` | 상세 문구 복구 |
| `client/src/index.css` | `form-notice` 스타일 |
| `server/src/app.js` | CORS/413/403/전역 오류 응답 |
| `server/src/controllers/favoritesController.js` | 중복/없는 즐겨찾기 메시지 |

---

## 검증 방법

실행 위치: `C:\dev\RWR_project\client`

CMD:

```cmd
npm run build
```

PowerShell:

```powershell
npm run build
```

실행 위치: `C:\dev\RWR_project\server`

CMD:

```cmd
node -e "require('./src/app'); console.log('server app loaded')"
```

PowerShell:

```powershell
node -e "require('./src/app'); console.log('server app loaded')"
```

확인 결과:

```text
client vite build 성공
server app loaded
```

---

## 제외 범위

| 제외 항목 | 사유 |
| --- | --- |
| 로그인/인증 기능 | MVP 범위 밖 |
| DB schema 대규모 변경 | Step 06 안정화 범위 밖 |
| seed 데이터 전면 정리 | Step 07 또는 별도 데이터 정리 단계 권장 |
| Docker 통합 실행 | 현재 환경상 실패 가능성이 있어 제외 |
| 커밋/push/PR 생성 | 사용자 직접 수행 |

---

## 리뷰어 참고

- 서버 seed/검증값의 인코딩 이슈는 완전 정리하지 않고 화면 표시 라벨 변환을 유지했다.
- 중복 즐겨찾기는 실패로만 보지 않고 이미 저장된 상태로 UI를 맞춘다.
- 추천 이력 저장 실패는 추천 결과 표시를 막지 않는다.
- CORS origin은 `CORS_ORIGIN=http://localhost:5173,https://example.com`처럼 쉼표로 확장할 수 있다.
