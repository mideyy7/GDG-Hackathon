import CrabSVG from './CrabSVG';

interface Props {
  onEnter: () => void;
}

export default function LandingPage({ onEnter }: Props) {
  return (
    <div className="relative min-h-screen bg-[#0A0A0A] flex flex-col font-sans overflow-hidden">

      {/* ── Top Nav (Navbar aesthetic from screenshot) ── */}
      <div className="relative z-30 flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded bg-white flex items-center justify-center">
            <CrabSVG className="w-6 h-6 text-[#0A0A0A]" />
          </div>
          <span className="text-white font-bold tracking-[0.15em] text-sm">COREDEV</span>
        </div>

        <button
          onClick={onEnter}
          className="px-6 py-2 border border-[#FF5A20]/40 text-[#FF5A20] text-xs font-bold tracking-widest rounded-sm hover:bg-[#FF5A20]/10 transition-colors uppercase"
        >
          Dashboard →
        </button>
      </div>

      {/* ── Background subtle gradient ── */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 100%, rgba(255,90,32,0.03) 0%, transparent 50%)'
        }}
      />

      {/* ── Main Content block ── */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row items-center px-6 lg:px-20 lg:gap-20">

        {/* Left Text Block */}
        <div className="w-full lg:w-1/2 flex flex-col text-left justify-center pb-20 lg:pb-0 pt-20 lg:pt-0">
          <h1 className="text-5xl sm:text-7xl lg:text-[7rem] font-bold leading-[1.02] tracking-tight mb-8">
            <span className="text-white block">Every repo interaction.</span>
            <span className="text-[#FF5A20] block mt-1 lg:mt-3">One prompt.</span>
          </h1>

          <p className="max-w-[80%] text-[#888] text-base lg:text-xl font-normal leading-relaxed mb-10">
            AI-native infrastructure for engineering teams.
            Planning, generation, and review — unified through a single agentic platform and the chat workflow already on your device.
          </p>

          <div>
            <button
              onClick={onEnter}
              className="px-8 py-4 bg-[#FF5A20] text-[#0A0A0A] font-bold text-sm lg:text-base tracking-wider rounded-sm hover:bg-[#e6511c] transition-colors shadow-[0_0_20px_rgba(255,90,32,0.15)] uppercase flex items-center gap-2"
            >
              Go to Dashboard
            </button>
          </div>
        </div>

        {/* Right Asset Block (Simulating the device feed panel from screenshot) */}
        <div className="hidden lg:flex w-full lg:w-1/2 justify-end relative h-full items-center">

          {/* Faint network lines backdrop */}
          <div className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: `linear-gradient(90deg, transparent 49%, rgba(255,90,32,0.1) 50%, transparent 51%), 
                                 linear-gradient(transparent 49%, rgba(255,90,32,0.1) 50%, transparent 51%)`,
              backgroundSize: '100px 100px',
            }}
          />

          <div className="relative z-20 w-[450px] border border-white/5 bg-[#121212] rounded-xl p-8 shadow-2xl mr-10 xl:mr-20">
            {/* Header / Version badge */}
            <div className="flex flex-col items-center gap-2 mb-10">
              <span className="text-[10px] text-[#FF5A20] font-mono tracking-widest uppercase bg-[#FF5A20]/10 px-3 py-1 rounded">CoreDev v1.0</span>
              <span className="text-white font-bold tracking-widest text-lg">PROMPT <span className="text-white/40 ml-1">✓</span></span>
              <span className="text-[#666] text-[9px] font-mono tracking-widest mt-1">G. PLANNER — {new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>

            {/* Glowing inner region */}
            <div className="relative w-[280px] h-[280px] mx-auto border border-white/5 rounded-full flex items-center justify-center">
              <div className="absolute inset-0 border border-[#FF5A20]/20 rounded-full scale-75 animate-pulse-slow"></div>
              <div className="absolute inset-0 border border-[#FF5A20]/10 rounded-full scale-50"></div>

              {/* Crab Logo in the pulse center */}
              <div className="relative z-10 text-[#FF5A20]">
                <CrabSVG className="w-16 h-16 opacity-90" style={{ filter: 'drop-shadow(0 0 20px rgba(255,90,32,0.4))' }} />
              </div>

              {/* Indicator dot */}
              <div className="absolute bottom-6 w-1.5 h-1.5 bg-[#FF5A20] rounded-full shadow-[0_0_8px_#FF5A20]"></div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
