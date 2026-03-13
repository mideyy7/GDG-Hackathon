const PILLARS = [
  {
    tag: 'Privacy-first',
    title: 'Your code never leaves your control',
    body: 'All code inference runs through Venice.ai — a privacy-first inference provider that does not log codebase content. This is the enterprise conversation Devin and SWE-Agent cannot have.',
    accent: true,
  },
  {
    tag: 'Dual-agent review',
    title: 'Every line reviewed by a separate AI',
    body: 'The Reviewer Agent never sees the Generator\'s internal reasoning — only its output. This mirrors how top engineering teams actually work: written by one, reviewed by another.',
    accent: false,
  },
  {
    tag: 'Human approval gate',
    title: 'You approve the plan before code is written',
    body: 'DevCore returns an architecture plan — affected files, agent assignments, risk flags — and waits for explicit approval. No AI writes a single line until you say go.',
    accent: false,
  },
];

export default function Solution() {
  return (
    <section className="py-24 bg-white" id="solution">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="section-label mx-auto mb-4 w-fit">The Solution</div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight max-w-3xl mx-auto leading-tight">
            A team of specialised AI engineers that{' '}
            <span className="gradient-text">lives in your messaging app.</span>
          </h2>
          <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">
            Not a chatbot. Not a single-agent tool. A coordinated pair-programming system
            with human oversight built in at every step.
          </p>
        </div>

        {/* Pillars */}
        <div className="grid lg:grid-cols-3 gap-8 mb-20">
          {PILLARS.map((p, i) => (
            <div
              key={i}
              className={`rounded-2xl p-8 border transition-all duration-300 hover:-translate-y-1 ${
                p.accent
                  ? 'bg-red-brand text-white border-red-dark shadow-xl shadow-red-brand/20'
                  : 'bg-white text-gray-900 border-gray-100 shadow-sm hover:shadow-md hover:border-red-100'
              }`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-md ${
                  p.accent ? 'bg-white/20 text-white' : 'bg-red-50 text-red-brand'
                }`}
              >
                {p.tag}
              </span>
              <h3 className={`mt-4 text-xl font-bold leading-snug ${p.accent ? 'text-white' : 'text-gray-900'}`}>
                {p.title}
              </h3>
              <p className={`mt-3 text-sm leading-relaxed ${p.accent ? 'text-white/80' : 'text-gray-500'}`}>
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Architecture diagram */}
        <div className="bg-gray-950 rounded-3xl p-8 lg:p-12 text-white overflow-x-auto">
          <p className="text-xs font-mono text-gray-500 mb-6 uppercase tracking-widest">System Architecture</p>
          <pre className="font-mono text-sm text-gray-300 leading-relaxed whitespace-pre">{`
  [You: Telegram / WhatsApp]
        │  "The login button is broken on mobile Safari"
        ▼
  [OpenClaw Gateway]  ─────────────────────────────────────────
        │                                               memory │
        ▼                                                      │
  [Orchestrator]  ──  GitHub Issue  ──  Architecture Planner ◄─┘
        │                                   (GLM-4 via Z.AI)
        │  ← Awaits your APPROVAL ─────────────────────────
        │
        ▼
  [Generator Agent]  Qwen2.5-Coder-32B  (Venice.ai, no logging)
        │  writes code
        ▼
  [Reviewer Agent]  DeepSeek-R1  ──  APPROVED  ──►  Pull Request
                                  └─  REWRITE  ──►  Generator loops
          `.trim()}</pre>
        </div>
      </div>
    </section>
  );
}
