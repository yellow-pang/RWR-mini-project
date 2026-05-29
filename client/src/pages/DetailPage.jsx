import { useParams, useNavigate } from 'react-router-dom'

function DetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="page detail-page">
      <button className="btn-back" onClick={() => navigate(-1)}>
        ← 뒤로
      </button>

      <h1 className="page-title">코스 상세</h1>

      {/* Step 04에서 구현 — 코스 상세 정보 */}
      <p className="placeholder-text">코스 ID: {id}</p>
      <p className="placeholder-text">코스 상세 정보가 여기에 표시됩니다</p>
    </div>
  )
}

export default DetailPage
