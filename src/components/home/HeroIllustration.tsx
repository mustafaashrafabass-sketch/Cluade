/**
 * Technical line drawing (distribution board, cable tray, valve and pipework)
 * drawn in SVG so the hero needs no stock photography. Replace with licensed
 * project photography by passing an image to <Hero> if preferred.
 */
export function HeroIllustration() {
  const line = "rgb(255 255 255 / 0.55)";
  const faint = "rgb(255 255 255 / 0.22)";
  const accent = "#5b8cff";
  return (
    <svg viewBox="0 0 520 440" className="h-auto w-full" role="presentation" aria-hidden focusable={false}>
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <path d="M0 0v6" stroke={faint} strokeWidth="1" />
        </pattern>
      </defs>

      {/* Dimension line */}
      <g stroke={faint} strokeWidth="1" fill="none">
        <path d="M40 22v14M250 22v14M40 29h210" />
        <path d="M40 29l6-3v6zM250 29l-6-3v6z" fill={faint} />
      </g>
      <text x="145" y="18" textAnchor="middle" fill={faint} fontSize="10" fontFamily="ui-monospace, monospace">1200</text>

      {/* Distribution board */}
      <g fill="none" stroke={line} strokeWidth="1.5">
        <rect x="40" y="44" width="210" height="300" rx="3" />
        <rect x="52" y="56" width="186" height="276" rx="2" stroke={faint} />
        {/* Main breaker */}
        <rect x="112" y="72" width="66" height="44" rx="2" />
        <rect x="136" y="82" width="18" height="24" rx="1" stroke={accent} />
        {/* Busbar */}
        <path d="M70 134h150M70 140h150M70 146h150" stroke={accent} strokeWidth="1.25" />
        {/* Breaker rows */}
        {[0, 1, 2].map((row) => (
          <g key={row}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((col) => (
              <g key={col}>
                <rect x={68 + col * 19.5} y={166 + row * 52} width="14" height="36" rx="1.5" />
                <rect x={72 + col * 19.5} y={176 + row * 52} width="6" height="9" fill={row === 1 && col === 3 ? accent : "none"} stroke={row === 1 && col === 3 ? accent : faint} />
              </g>
            ))}
            <path d={`M64 ${210 + row * 52}h162`} stroke={faint} />
          </g>
        ))}
        {/* Door hinge marks */}
        <path d="M40 80h-6M40 300h-6" />
      </g>

      {/* Cable tray from board top */}
      <g fill="none" stroke={line} strokeWidth="1.5">
        <path d="M200 44V0" stroke={faint} />
        <path d="M218 44V0" stroke={faint} />
        <rect x="270" y="58" width="230" height="24" fill="url(#hatch)" />
        <path d="M250 70h20" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <path key={i} d={`M${284 + i * 25} 58v24`} stroke={faint} />
        ))}
        <path d="M262 64c40 0 60 6 238 6" stroke={accent} strokeWidth="1.25" />
        <path d="M262 76c40 0 60-4 238-4" stroke={accent} strokeWidth="1.25" opacity="0.6" />
      </g>

      {/* Pipework with gate valve and flanges */}
      <g fill="none" stroke={line} strokeWidth="1.5">
        <path d="M280 300h70M280 324h70" />
        <rect x="350" y="290" width="10" height="44" rx="1" />
        <rect x="360" y="294" width="56" height="36" rx="3" />
        <rect x="416" y="290" width="10" height="44" rx="1" />
        <path d="M426 300h74M426 324h74" />
        <path d="M388 294v-40" />
        <rect x="378" y="234" width="20" height="20" rx="1" />
        <ellipse cx="388" cy="226" rx="34" ry="6" />
        <path d="M354 226h68" stroke={faint} />
        {/* Flange bolts */}
        {[296, 312, 328].map((y) => (
          <g key={y}>
            <circle cx="355" cy={y} r="1.6" fill={line} stroke="none" />
            <circle cx="421" cy={y} r="1.6" fill={line} stroke="none" />
          </g>
        ))}
        {/* Flow arrow */}
        <path d="M292 312h40" stroke={accent} />
        <path d="M332 312l-7-4v8z" fill={accent} stroke="none" />
        {/* Pipe elbow down */}
        <path d="M500 300v0M280 300c-14 0-20 10-20 24v86M280 324c-2 0-4 4-4 10v76" />
        <path d="M252 410h36" />
      </g>

      {/* Gauge */}
      <g fill="none" stroke={line} strokeWidth="1.5">
        <path d="M470 300v-36" />
        <circle cx="470" cy="244" r="20" />
        <path d="M456 252a16 16 0 0 1 28 0" stroke={faint} />
        <path d="M470 244l10-9" stroke={accent} strokeWidth="2" />
        <circle cx="470" cy="244" r="2" fill={line} stroke="none" />
      </g>

      {/* Callouts */}
      <g stroke={faint} strokeWidth="1" fill="none">
        <path d="M178 94l70-50h30" />
        <path d="M424 330l30 46h40" />
      </g>
      <g fill="rgb(255 255 255 / 0.4)" fontSize="9.5" fontFamily="ui-monospace, monospace" letterSpacing="0.06em">
        <text x="284" y="47">MCCB 630A</text>
        <text x="458" y="372" textAnchor="end">DN100 PN16</text>
      </g>
    </svg>
  );
}
