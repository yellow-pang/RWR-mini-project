const ICON_PATHS = {
  alert: (
    <>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17.5h.01" />
    </>
  ),
  back: <path d="m15 18-6-6 6-6" />,
  bell: (
    <>
      <path d="M18 16H6l1.3-1.6V10a4.7 4.7 0 0 1 9.4 0v4.4L18 16Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  foot: (
    <>
      <path d="M9.6 4.8c1.2.3 1.8 1.7 1.4 3.2l-1.5 5.5c-.4 1.4-1.5 2.2-2.6 1.9-1.2-.3-1.8-1.6-1.4-3L7 6.8c.4-1.5 1.4-2.3 2.6-2Z" />
      <path d="M15.8 9.1c1 .2 1.5 1.3 1.2 2.6l-1.2 4.5c-.3 1.2-1.2 1.9-2.2 1.6s-1.5-1.3-1.2-2.5l1.2-4.6c.3-1.2 1.2-1.9 2.2-1.6Z" />
    </>
  ),
  heart: (
    <path d="M20 8.4c0 5-8 9.6-8 9.6S4 13.4 4 8.4A4.2 4.2 0 0 1 12 6a4.2 4.2 0 0 1 8 2.4Z" />
  ),
  home: (
    <>
      <path d="M4 11.5 12 5l8 6.5" />
      <path d="M6.5 10v9h11v-9" />
      <path d="M10 19v-5h4v5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  menu: (
    <>
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s6-5.4 6-11a6 6 0 0 0-12 0c0 5.6 6 11 6 11Z" />
      <circle cx="12" cy="10" r="2.1" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="5.8" />
      <path d="m15 15 5 5" />
    </>
  ),
  share: (
    <>
      <path d="M12 4v10" />
      <path d="m8 8 4-4 4 4" />
      <path d="M6 13v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-5" />
    </>
  ),
  runner: (
    <>
      <circle cx="14" cy="4.5" r="1.8" />
      <path d="m10.5 9.2 2-2.2 3 2.2 2.4.2" />
      <path d="m12.4 9.8-2.1 3.8-3.2.9" />
      <path d="m13.5 11.5 2.8 2.4.8 3.4" />
    </>
  ),
  shoe: (
    <>
      <path d="M4 15.5h15.5c.5 0 .9.4.9.9v.4c0 .7-.6 1.2-1.3 1.2H5.8C4.8 18 4 17.2 4 16.2v-.7Z" />
      <path d="m6.5 15.5 2-7 7.2 7" />
      <path d="m9 11.2 2.2 1.2" />
      <path d="m10.2 9.7 2.2 1.2" />
    </>
  ),
  star: (
    <path d="m12 4 2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6L7.2 19l.9-5.4-3.9-3.8 5.4-.8L12 4Z" />
  ),
  trash: (
    <>
      <path d="M5 7h14" />
      <path d="M9 7V5h6v2" />
      <path d="M8 10v9" />
      <path d="M16 10v9" />
      <path d="M6.5 7 7.3 21h9.4l.8-14" />
    </>
  ),
};

function Icon({ name, size = 24, className = "", filled = false }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <g
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {ICON_PATHS[name]}
      </g>
    </svg>
  );
}

export default Icon;
