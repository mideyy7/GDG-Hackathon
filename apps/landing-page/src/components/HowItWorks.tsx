const STEPS = [
  {
    number: '01',
    icon: '💬',
    title: 'Send a plain-English message',
    body: 'Type your bug report or feature request in Telegram or WhatsApp — exactly as you\'d describe it to a colleague. No ticket template, no JIRA.',
    detail: '"The login button is broken on mobile Safari"',
  },
  {
    number: '02',
    icon: '🏗️',
    title: 'Review the architecture plan',
    body: 'The Orchestrator creates a GitHub issue, analyses your codebase, and returns a plan: affected files, agent assignments, and risk flags.',
    detail: 'auth/LoginButton.tsx, hooks/useAuth.ts · Risk: Safari CSS vendor prefix',
  },
  {
    number: '03',
    icon: '✅',
    title: 'Approve before any code is written',
    body: 'Nothing happens until you say so. Reply /approve to start execution, /refine to adjust the plan, or /reject to cancel.',
    detail: '/approve plan-a3f9c',
  },
  {
    number: '04',
    icon: '🤖',
    title: 'Agents write and review in parallel',
    body: 'The Generator writes the fix. The Reviewer — a separate model with a separate context window — checks for bugs, anti-patterns, and security issues.',
    detail: 'Reviewer → REWRITE: line 47 missing vendor prefix → Generator loops',
  },
  {
    number: '05',
    icon: '🎉',
    title: 'Get a documented pull request',
    body: 'A PR lands in your GitHub with an auto-description, CHANGELOG entry, and TSDoc comments on every changed function.',
    detail: 'PR #48 · "Fix Safari vendor prefix on login CTA" · Reviewed ✓ Documented ✓',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="section-label mx-auto mb-4 w-fit">How It Works</div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            From message to{' '}
            <span className="gradient-text">merged PR</span> in minutes.
          </h2>
        </div>

        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-red-brand via-red-200 to-transparent hidden sm:block" />

          <div className="flex flex-col gap-12">
            {STEPS.map((step, i) => (
              <div
                key={i}
                className={`relative flex items-start gap-8 ${
                  i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'
                }`}
              >
                {/* Step node */}
                <div className="hidden lg:flex absolute left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-red-brand text-white font-black text-sm items-center justify-center z-10 shadow-lg shadow-red-brand/30 ring-4 ring-white">
                  {i + 1}
                </div>

                {/* Content card */}
                <div className={`flex-1 ${i % 2 === 0 ? 'lg:pr-16' : 'lg:pl-16'}`}>
                  <div className="card group hover:border-red-100 hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{step.icon}</span>
                      <span className="text-xs font-black text-red-brand font-mono">{step.number}</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{step.body}</p>
                    <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-2.5 font-mono text-xs text-gray-600 group-hover:border-red-100 transition-colors">
                      {step.detail}
                    </div>
                  </div>
                </div>

                {/* Spacer for alternating layout */}
                <div className="hidden lg:block flex-1" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
