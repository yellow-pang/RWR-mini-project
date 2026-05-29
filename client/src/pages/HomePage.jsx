function HomePage() {
  return (
    <div className="page home-page">
      <h1 className="page-title">오늘의 코스</h1>
      <p className="page-desc">조건을 선택하고 랜덤 코스를 추천받으세요</p>

      {/* Step 04에서 구현 — 거리 선택 */}
      <section className="condition-section">
        <h2 className="condition-title">거리</h2>
        <div className="chip-group">
          <button className="chip">1km</button>
          <button className="chip">3km</button>
          <button className="chip">5km</button>
        </div>
      </section>

      {/* Step 04에서 구현 — 소요 시간 선택 */}
      <section className="condition-section">
        <h2 className="condition-title">소요 시간</h2>
        <div className="chip-group">
          <button className="chip">15분</button>
          <button className="chip">30분</button>
          <button className="chip">60분</button>
        </div>
      </section>

      {/* Step 04에서 구현 — 운동 유형 선택 */}
      <section className="condition-section">
        <h2 className="condition-title">운동 유형</h2>
        <div className="chip-group">
          <button className="chip">걷기</button>
          <button className="chip">조깅</button>
          <button className="chip">러닝</button>
        </div>
      </section>

      <button className="btn-primary" disabled>
        추천받기
      </button>
    </div>
  );
}

export default HomePage;
