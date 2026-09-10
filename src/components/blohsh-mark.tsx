type BlohshMarkProps = {
  className?: string;
  title?: string;
};

/** The compact version of the neon Blohsh glyph used throughout the workspace. */
export function BlohshMark({ className = "", title = "Blohsh" }: BlohshMarkProps) {
  return (
    <svg
      viewBox="0 0 100 120"
      role="img"
      aria-label={title}
      className={`blohsh-mark ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="blohsh-neon" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#c8ff00" />
          <stop offset="0.5" stopColor="#45ff38" />
          <stop offset="1" stopColor="#00d936" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="17" r="10" fill="url(#blohsh-neon)" />
      <path
        d="M18 30 49 43 83 30"
        fill="none"
        stroke="url(#blohsh-neon)"
        strokeLinecap="round"
        strokeWidth="13"
      />
      <path
        d="M30 45v45a13 13 0 0 0 26 0V58"
        fill="none"
        stroke="url(#blohsh-neon)"
        strokeLinecap="round"
        strokeWidth="13"
      />
      <path
        d="M69 47v39a13 13 0 0 1-26 0V68"
        fill="none"
        stroke="url(#blohsh-neon)"
        strokeLinecap="round"
        strokeWidth="13"
      />
      <path
        d="M23 39h15M61 38h17M16 72h12M71 70h12M39 108h20"
        stroke="#c8ff00"
        strokeWidth="2"
        opacity=".8"
      />
    </svg>
  );
}
