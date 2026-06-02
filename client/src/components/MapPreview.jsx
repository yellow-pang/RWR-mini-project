import Icon from "./Icon";
import "./MapPreview.css";

function MapPreview({ compact = false, course }) {
  const label = course?.mood ? "추천 코스" : "코스 프리뷰";

  return (
    <div className={`map-preview${compact ? " compact" : ""}`}>
      <svg className="map-preview-art" viewBox="0 0 420 220" aria-hidden="true">
        <rect width="420" height="220" className="map-base" />
        <path d="M0 56h120l80-56h220" className="map-road" />
        <path d="M0 178h90l72-58 98 12 160-82" className="map-road" />
        <path d="M60 0v220M180 0v220M320 0v220" className="map-street" />
        <path d="M0 132c48-26 73-28 118-8 54 25 85 18 126-24 45-45 90-48 176-6v126H0Z" className="map-park" />
        <path d="M276 0c-20 36-18 68 6 96 28 34 26 63-4 96" className="map-water" />
        <ellipse cx="245" cy="158" rx="52" ry="34" className="map-lake" />
        <path
          className="map-route route-shadow"
          d="M82 136c20-55 57-89 112-94 47-4 71 18 110 25 35 6 64 20 62 48-2 31-42 45-57 75-20 39-79 30-113 14-28-14-59-13-84-27-18-11-37-22-30-41Z"
        />
        <path
          className="map-route"
          d="M82 136c20-55 57-89 112-94 47-4 71 18 110 25 35 6 64 20 62 48-2 31-42 45-57 75-20 39-79 30-113 14-28-14-59-13-84-27-18-11-37-22-30-41Z"
        />
        <g className="map-route-arrows">
          <path d="m151 66 13 5-12 7" />
          <path d="m291 73 13 5-12 7" />
          <path d="m322 164-13 6 7-13" />
          <path d="m180 199-13-4 11-8" />
        </g>
        <circle cx="82" cy="136" r="13" className="map-start" />
      </svg>
      <div className="map-label">
        <Icon name="shoe" size={26} />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default MapPreview;
