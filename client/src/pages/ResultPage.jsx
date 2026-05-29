import { useNavigate } from "react-router-dom";

function ResultPage() {
  const navigate = useNavigate();

  return (
    <div className="page result-page">
      <h1 className="page-title">추천 코스</h1>

      {/* Step 04에서 구현 — 코스 카드 */}
      <div className="course-card-placeholder">
        <p>코스 카드가 여기에 표시됩니다</p>
      </div>

      <div className="result-actions">
        <button className="btn-secondary" onClick={() => navigate("/")}>
          조건 변경
        </button>
        <button className="btn-primary">다시 추천</button>
      </div>
    </div>
  );
}

export default ResultPage;
