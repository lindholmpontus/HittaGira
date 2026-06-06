type Props = {
  className?: string;
  showWordmark?: boolean;
  title?: string;
};

/**
 * HittaGira mark — a guitar rosette emblem (concentric rings around a
 * "sound hole" with three light strings crossing it) paired with the
 * editorial wordmark: "Hitta" in roman, "Gira" in italic oxblood.
 */
export function HittaGiraLogo({
  className,
  showWordmark = true,
  title = "HittaGira",
}: Props) {
  return (
    <svg
      className={className}
      viewBox={showWordmark ? "0 0 260 56" : "0 0 56 56"}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <radialGradient id="hg-sunburst" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#F4E0A4" />
          <stop offset="55%" stopColor="#B07A11" />
          <stop offset="100%" stopColor="#5C1620" />
        </radialGradient>
        <clipPath id="hg-clip">
          <circle cx="24" cy="28" r="22" />
        </clipPath>
      </defs>

      {/* Rosette emblem */}
      <g>
        {/* Outer decorative ring */}
        <circle
          cx="24"
          cy="28"
          r="22.5"
          fill="none"
          stroke="#7A1F2B"
          strokeWidth="0.8"
        />
        {/* Sunburst body */}
        <circle cx="24" cy="28" r="21" fill="url(#hg-sunburst)" />
        {/* Inner concentric rings (rosette inlay) */}
        <circle
          cx="24"
          cy="28"
          r="17"
          fill="none"
          stroke="#3E0E16"
          strokeWidth="0.6"
          opacity="0.55"
        />
        <circle
          cx="24"
          cy="28"
          r="13.5"
          fill="none"
          stroke="#F4E0A4"
          strokeWidth="0.5"
          opacity="0.6"
        />
        {/* Sound hole */}
        <circle cx="24" cy="28" r="9.5" fill="#1A100C" />
        <circle
          cx="24"
          cy="28"
          r="8"
          fill="none"
          stroke="#B07A11"
          strokeWidth="0.5"
          opacity="0.8"
        />
        {/* Three strings crossing the body */}
        <g
          clipPath="url(#hg-clip)"
          stroke="#F4E0A4"
          strokeWidth="0.55"
          opacity="0.85"
        >
          <line x1="1" y1="22" x2="47" y2="22" />
          <line x1="1" y1="28" x2="47" y2="28" />
          <line x1="1" y1="34" x2="47" y2="34" />
        </g>
        {/* Tiny tuning-peg dot (catalog inlay) */}
        <circle cx="44" cy="9" r="1.6" fill="#B07A11" />
      </g>

      {showWordmark && (
        <>
          {/* Wordmark */}
          <g
            fontFamily="'Newsreader', Georgia, ui-serif, serif"
            fontSize="30"
            letterSpacing="-0.6"
          >
            <text x="60" y="38" fontWeight="600" fill="#1A100C">
              Hitta
            </text>
            <text
              x="138"
              y="38"
              fontWeight="500"
              fontStyle="italic"
              fill="#7A1F2B"
            >
              Gira
            </text>
          </g>
          {/* Caption — tiny mono kerf under wordmark */}
          <g>
            <line
              x1="60"
              y1="46"
              x2="220"
              y2="46"
              stroke="#BDA978"
              strokeWidth="0.5"
            />
            <text
              x="60"
              y="53.5"
              fontFamily="'IBM Plex Mono', ui-monospace, monospace"
              fontSize="6.5"
              letterSpacing="2.4"
              fill="#8C775B"
            >
              REGISTER · SE
            </text>
          </g>
        </>
      )}
    </svg>
  );
}
