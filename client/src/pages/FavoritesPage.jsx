function FavoritesPage() {
  return (
    <div className="page favorites-page">
      <h1 className="page-title">즐겨찾기</h1>

      {/* Step 04에서 구현 — 즐겨찾기 목록 */}
      <div className="empty-state">
        <p className="empty-state-title">저장된 즐겨찾기가 없어요</p>
        <p className="empty-state-desc">마음에 드는 코스를 저장해 보세요</p>
      </div>
    </div>
  );
}

export default FavoritesPage;
