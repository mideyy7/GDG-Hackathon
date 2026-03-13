const FEATURES = [
  {
    icon: '🎯',
    title: 'True multi-agent specialisation',
    body: 'A NextJS agent knows NextJS patterns deeply. It doesn\'t share a context window with the Python ML agent. Specialisation reduces hallucination.',
  },
  {
    icon: '🔄',
    title: 'Adversarial pair review',
    body: 'The Reviewer never sees the Generator\'s reasoning — only its output. Two AIs disagreeing catches more bugs than one AI agreeing with itself.',
  },
  {
    icon: '🔒',
    title: 'Venice.ai private inference',
    body: 'Your codebase never gets logged on third-party inference servers. One feature that opens the enterprise sales conversation no competitor can have.',
  },
  {
    icon: '📋',
    title: 'Human approval gate',
    body: 'An architecture plan is returned before any code is written. Affected files, risk flags, agent assignments. You approve — then and only then do agents execute.',
  },
  {
    icon: '📝',
    title: 'Auto-documentation built in',
    body: 'TSDoc on every changed function, CHANGELOG entry, auto-generated PR description. Not an afterthought — it\'s the Reviewer Agent\'s job.',
  },
  {
    icon: '💬',
    title: 'Lives in your messaging app',
    body: 'Telegram, WhatsApp, or Slack. No new tool to learn, no new login. Your PM can ship code without touching a terminal.',
  },
  {
    icon: '🧠',
    title: 'Cross-session memory',
    body: 'DevCore remembers your codebase, your patterns, your preferences. Each new task starts from context, not from scratch.',
  },
  {
    icon: '🌍',
    title: 'Open-source model stack',
    body: 'Qwen2.5-Coder benchmarks within 5% of GPT-4o on targeted code tasks, at a fraction of the cost. This is the pitch, not a compromise.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="section-label mx-auto mb-4 w-fit">Features</div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            Built different on every axis{' '}
            <span className="gradient-text">that matters.</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((f, i) => (
            <div
              key={i}
              className="group card hover:border-red-100 hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <span className="text-2xl">{f.icon}</span>
              <h3 className="mt-3 text-base font-bold text-gray-900 leading-snug group-hover:text-red-brand transition-colors">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        {/* Highlight stat bar */}
        <div className="mt-20 bg-red-brand rounded-2xl p-8 lg:p-12 grid sm:grid-cols-3 gap-8 text-white text-center">
          {[
            { value: 'Custom', label: 'pricing plan', note: 'tailored setup' },
            { value: '0', label: 'lines of code logged', note: 'privacy-first inference' },
            { value: '2×', label: 'AI review on every PR', note: 'generator + reviewer' },
          ].map((stat, i) => (
            <div key={i} className={i > 0 ? 'sm:border-l border-white/20' : ''}>
              <p className="text-5xl font-black">{stat.value}</p>
              <p className="mt-1 text-lg font-semibold text-white/90">{stat.label}</p>
              <p className="text-sm text-white/60 mt-1">{stat.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
