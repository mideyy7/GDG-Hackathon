import CrabSVG from './CrabSVG';

interface Props {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="relative min-h-screen bg-[#000000] flex flex-col items-center justify-center overflow-hidden select-none font-sans">

      {/* ── Grid Dots Background ── */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.08]"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #fff 0.5px, transparent 0.5px)',
          backgroundSize: '40px 40px',
        }}
        aria-hidden="true"
      />

      {/* ── Deep vignette ── */}
      <div
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse 90% 90% at center, transparent 10%, rgba(0,0,0,0.85) 60%, #000000 100%)',
        }}
      />

      {/* ── Glows ── */}
      <div className="absolute top-[35%] left-[50%] w-[600px] h-[400px] bg-[#E8192C] opacity-[0.06] blur-[150px] pointer-events-none z-0 rounded-full" />
      <div className="absolute top-[40%] left-[55%] w-[400px] h-[300px] bg-[#E8192C] opacity-[0.08] blur-[80px] pointer-events-none z-0 rounded-full" />

      {/* ── Crab — positioned under the right side ── */}
      <div className="absolute top-[-5%] left-[38%] w-[1600px] max-w-none pointer-events-none opacity-[0.4] z-0 mix-blend-screen" style={{ transform: 'rotate(-2deg)' }}>
        <CrabSVG
          className="w-full h-auto text-[#E8192C]"
          style={{ filter: 'drop-shadow(0 0 30px rgba(232,25,44,0.3))' }}
        />
      </div>

      {/* ── Foreground content ── */}
      <div className="relative z-20 flex flex-col items-center text-center -mt-10">

        {/* Top Tagline */}
        <div className="flex items-center gap-4 mb-4 opacity-70">
          <div className="w-10 h-px bg-gradient-to-l from-[#66151a] to-transparent" />
          <span className="text-[9px] font-mono text-[#7a2b30] tracking-[0.5em] uppercase">AI Engineering Agent</span>
          <div className="w-10 h-px bg-gradient-to-r from-[#66151a] to-transparent" />
        </div>

        {/* Title */}
        <h1 className="text-[7rem] sm:text-[9.5rem] lg:text-[11.5rem] font-normal leading-[1] tracking-tight flex items-center justify-center gap-5 lg:gap-7 mb-7">
          <span className="text-[#bfbfbf]">DEV</span>
          <span className="text-[#E8192C] relative">
            CLAW
            <div className="absolute inset-0 bg-[#E8192C] opacity-[0.25] blur-[40px] z-[-1]" />
          </span>
        </h1>

        {/* Dot dividers */}
        <div className="flex items-center justify-center gap-[6px] mt-0 mb-10 opacity-90">
          <div className="w-8 h-px bg-gradient-to-l from-[#4a1114] to-transparent" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#5a1518]" />
          <div className="w-[3.5px] h-[3.5px] rounded-full bg-[#E8192C] shadow-[0_0_8px_#E8192C]" />
          <div className="w-[3px] h-[3px] rounded-full bg-[#5a1518]" />
          <div className="w-8 h-px bg-gradient-to-r from-[#4a1114] to-transparent" />
        </div>

        {/* Sub-tagline */}
        <div className="flex flex-col gap-[10px] text-[#6b6b6b] uppercase font-mono text-[9px] md:text-[10px] tracking-[0.4em] mb-12 drop-shadow-md">
          <p>Real-time code generation.</p>
          <p>Full workflow automation.</p>
        </div>

        {/* Enter button */}
        <button
          onClick={onEnter}
          className="group relative flex items-center justify-center gap-3 px-10 py-[12px] rounded-md bg-[#050000]/80 border border-[#4a1114] text-[#8c1e22] hover:text-[#E8192C] hover:border-[#6b1318] hover:bg-black font-mono text-[10px] md:text-[11px] font-medium tracking-[0.2em] transition-all backdrop-blur-md"
        >
          ENTER <span className="text-[14px] font-sans -mt-0.5 opacity-80">→</span>
        </button>

      </div>

      {/* Bottom Center text */}
      <div className="absolute bottom-10 flex flex-col items-center gap-3 z-20 opacity-30 hover:opacity-80 transition-opacity">
        <span className="text-[9px] text-[#555] uppercase font-mono tracking-[0.4em]">Scroll</span>
        <span className="text-[#444] text-[10px] font-sans">↓</span>
      </div>

      {/* Bottom right watermark */}
      <p className="absolute bottom-6 right-10 text-[8px] text-[#333] font-mono z-20 tracking-[0.4em] uppercase">
        Powered by Z.AI GLM
      </p>
    </div>
  );
}
