function HistoryPage() {
  return (
    <div className="page history-page">
      <h1 className="page-title">최근 추천</h1>

      {/* Step 04에서 구현 — 추천 이력 목록 */}
      <div className="empty-state">
        <p className="empty-state-title">추천 이력이 없어요</p>
        <p className="empty-state-desc">코스를 추천받으면 기록이 쌓입니다</p>
      </div>
    </div>
  );
}

export default HistoryPage;
