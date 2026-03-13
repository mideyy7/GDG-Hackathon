interface Props {
  onBack: () => void;
  onSubscribed: () => void;
}

export default function SubscriptionPage({ onBack, onSubscribed }: Props) {
  return (
    <div className="relative h-screen bg-[#050505] flex items-center justify-center px-6 overflow-hidden">
      <div className="grain-overlay" aria-hidden="true" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, rgba(232,25,44,0.2) 0%, transparent 35%), radial-gradient(circle at 80% 90%, rgba(232,25,44,0.12) 0%, transparent 40%)',
        }}
      />

      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/40 hover:text-white/80 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Back
      </button>

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-md p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-white tracking-tight">
            Subscribe to <span className="text-red-brand">DevCore</span>
          </h1>
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/40">Access Gate</span>
        </div>

        <p className="text-white/60 text-sm leading-relaxed mb-6">
          Complete your subscription to unlock GitHub, Telegram, and WhatsApp links.
        </p>

        <div className="rounded-2xl border border-red-brand/25 bg-red-brand/10 p-5 mb-6">
          <p className="text-white/70 text-xs uppercase tracking-[0.2em] mb-2">Pro Plan</p>
          <p className="text-white text-3xl font-black">
            £19<span className="text-white/50 text-base font-semibold">/month</span>
          </p>
          <ul className="mt-4 space-y-2 text-sm text-white/70">
            <li>Priority support</li>
            <li>Faster response queue</li>
            <li>Full link access after checkout</li>
          </ul>
        </div>

        <button
          onClick={onSubscribed}
          className="w-full py-3.5 rounded-xl bg-red-brand text-white font-bold text-sm tracking-wide hover:bg-red-700 active:scale-[0.98] transition-all"
          style={{ boxShadow: '0 0 24px rgba(232,25,44,0.35)' }}
        >
          Pay & Subscribe
        </button>

        <p className="mt-4 text-center text-[11px] text-white/35">
          Demo gate enabled: clicking subscribe unlocks the links page.
        </p>
      </div>
    </div>
  );
}
