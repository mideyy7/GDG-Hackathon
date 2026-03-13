import { CSSProperties } from 'react';

export default function CrabSVG({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 520 380"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {/* ── Left legs ── */}
      <line x1="168" y1="225" x2="90"  y2="265" stroke="#E8192C" strokeWidth="10" strokeLinecap="round" />
      <line x1="158" y1="245" x2="75"  y2="295" stroke="#E8192C" strokeWidth="10" strokeLinecap="round" />
      <line x1="152" y1="265" x2="68"  y2="320" stroke="#E8192C" strokeWidth="10" strokeLinecap="round" />

      {/* ── Right legs ── */}
      <line x1="352" y1="225" x2="430" y2="265" stroke="#E8192C" strokeWidth="10" strokeLinecap="round" />
      <line x1="362" y1="245" x2="445" y2="295" stroke="#E8192C" strokeWidth="10" strokeLinecap="round" />
      <line x1="368" y1="265" x2="452" y2="320" stroke="#E8192C" strokeWidth="10" strokeLinecap="round" />

      {/* ── Left claw arm ── */}
      <path
        d="M 165 195 Q 115 175 88 148 Q 62 120 46 135"
        stroke="#E8192C" strokeWidth="12" strokeLinecap="round" fill="none"
      />
      {/* Left pincer top */}
      <path
        d="M 46 135 Q 22 118 26 100 Q 30 82 52 92"
        stroke="#E8192C" strokeWidth="11" strokeLinecap="round" fill="none"
      />
      {/* Left pincer bottom */}
      <path
        d="M 46 135 Q 18 145 20 162 Q 22 178 48 172"
        stroke="#E8192C" strokeWidth="11" strokeLinecap="round" fill="none"
      />
      {/* Pincer tip connect */}
      <path d="M 52 92 Q 54 130 48 172" stroke="#E8192C" strokeWidth="6" strokeLinecap="round" fill="none" />

      {/* ── Right claw arm ── */}
      <path
        d="M 355 195 Q 405 175 432 148 Q 458 120 474 135"
        stroke="#E8192C" strokeWidth="12" strokeLinecap="round" fill="none"
      />
      {/* Right pincer top */}
      <path
        d="M 474 135 Q 498 118 494 100 Q 490 82 468 92"
        stroke="#E8192C" strokeWidth="11" strokeLinecap="round" fill="none"
      />
      {/* Right pincer bottom */}
      <path
        d="M 474 135 Q 502 145 500 162 Q 498 178 472 172"
        stroke="#E8192C" strokeWidth="11" strokeLinecap="round" fill="none"
      />
      <path d="M 468 92 Q 466 130 472 172" stroke="#E8192C" strokeWidth="6" strokeLinecap="round" fill="none" />

      {/* ── Body ── */}
      <ellipse cx="260" cy="220" rx="100" ry="80" fill="#E8192C" />
      {/* Shell highlight */}
      <ellipse cx="260" cy="215" rx="65" ry="48" fill="#C01020" />
      <ellipse cx="260" cy="210" rx="38" ry="26" fill="#A00E1A" />

    </svg>
  );
}
