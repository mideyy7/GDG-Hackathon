const CHAT_MESSAGES = [
  { from: 'user', text: 'The login button is broken on mobile Safari 🐛' },
  { from: 'bot', text: '✅ Issue #47 created in your repo.' },
  { from: 'bot', text: '🏗️ Architecture plan ready — 2 files affected. Approve to start?' },
  { from: 'user', text: '/approve' },
  { from: 'bot', text: '🤖 Generator + Reviewer agents working...' },
  { from: 'bot', text: '🎉 PR #48 opened — reviewed, documented, ready to merge.' },
];

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-red-50 rounded-full -translate-y-1/2 translate-x-1/3 opacity-60" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-red-50 rounded-full translate-y-1/2 -translate-x-1/4 opacity-40" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#E8192C 1px, transparent 1px), linear-gradient(to right, #E8192C 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
        {/* Left — copy */}
        <div className="flex flex-col gap-6">
          <div className="section-label w-fit animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-red-brand animate-pulse-slow" />
            Now in private beta · UK AI Agent Hack EP4
          </div>

          <h1 className="text-5xl lg:text-6xl font-black leading-tight tracking-tight">
            Your startup needs{' '}
            <span className="gradient-text">an engineering team.</span>
            {' '}Not another tool.
          </h1>

          <p className="text-xl text-gray-500 leading-relaxed max-w-lg">
            Send a plain-English bug report on Telegram or WhatsApp.
            DevClaw analyses your codebase, proposes a plan, writes the code,
            reviews it with a second AI, and opens a{' '}
            <span className="text-gray-900 font-medium">documented pull request</span> — all before your next standup.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <a href="#pricing" className="btn-primary text-base px-8 py-3.5">
              Get Early Access
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <a href="#how-it-works" className="btn-secondary text-base px-8 py-3.5">
              See how it works
            </a>
          </div>

          {/* Social proof */}
          <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
            <div>
              <p className="text-2xl font-bold text-gray-900">Custom<span className="text-sm font-medium text-gray-400">/mo</span></p>
              <p className="text-xs text-gray-400 mt-0.5">Full AI dev team</p>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div>
              <p className="text-2xl font-bold text-gray-900">2 AI</p>
              <p className="text-xs text-gray-400 mt-0.5">Agents per task</p>
            </div>
            <div className="w-px h-10 bg-gray-100" />
            <div>
              <p className="text-2xl font-bold text-gray-900">0</p>
              <p className="text-xs text-gray-400 mt-0.5">Code logged externally</p>
            </div>
          </div>
        </div>

        {/* Right — chat mockup */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="w-full max-w-sm">
            {/* Phone frame */}
            <div className="relative bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl shadow-gray-900/40">
              {/* Notch */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-6 bg-gray-800 rounded-full" />
              {/* Screen */}
              <div className="bg-white rounded-[2rem] overflow-hidden">
                {/* Telegram header */}
                <div className="bg-[#2AABEE] px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-white font-bold text-xs">DC</span>
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">DevClaw Bot</p>
                    <p className="text-white/70 text-xs">online</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="bg-[#F0F2F5] px-3 py-4 flex flex-col gap-2 min-h-[340px]">
                  {CHAT_MESSAGES.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm leading-snug ${msg.from === 'user'
                            ? 'bg-[#2AABEE] text-white rounded-br-sm'
                            : 'bg-white text-gray-800 rounded-bl-sm shadow-sm'
                          }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Input bar */}
                <div className="bg-white px-3 py-2 flex items-center gap-2 border-t border-gray-100">
                  <div className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-xs text-gray-400">
                    Message DevClaw Bot...
                  </div>
                  <div className="w-8 h-8 rounded-full bg-[#2AABEE] flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-red-brand text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-red-brand/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              PR opened in 3 min
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400 animate-bounce">
        <span className="text-xs font-medium">Scroll to explore</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </section>
  );
}
