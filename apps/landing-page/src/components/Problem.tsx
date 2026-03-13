const PAINS = [
  {
    icon: '⏳',
    title: 'Your backlog never shrinks',
    body: 'The feature list grows faster than your team can ship. Critical bugs sit for weeks because there\'s always something more urgent.',
  },
  {
    icon: '💸',
    title: 'Hiring is slow and expensive',
    body: 'A mid-level engineer costs £60k+/yr and takes 3 months to onboard. A second agency costs £10k/project and delivers late.',
  },
  {
    icon: '🔒',
    title: 'AI tools are black boxes',
    body: 'Devin costs $500/month, logs your codebase on their servers, and ships undocumented code with no human oversight. CTOs won\'t deploy it.',
  },
  {
    icon: '🧩',
    title: 'Single-agent tools hallucinate',
    body: 'ChatGPT and Copilot are one-agent tools. No review, no adversarial checking. What they ship looks plausible but breaks in production.',
  },
];

export default function Problem() {
  return (
    <section className="py-24 bg-gray-950 text-white relative overflow-hidden">
      {/* Red accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-brand to-transparent opacity-60" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="section-label mx-auto mb-4 bg-red-950 border-red-900 text-red-400 w-fit">
            The Problem
          </div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            Startup engineering teams are{' '}
            <span className="text-red-brand">overwhelmed.</span>
          </h2>
          <p className="mt-4 text-gray-400 text-lg max-w-xl mx-auto">
            You have a 10-person team, a 200-item backlog, and no budget for another agency. Sound familiar?
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PAINS.map((pain, i) => (
            <div
              key={i}
              className="relative bg-gray-900 border border-gray-800 rounded-2xl p-6 group hover:border-red-brand/40 transition-colors duration-300"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 rounded-2xl bg-red-brand/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative">
                <span className="text-3xl">{pain.icon}</span>
                <h3 className="mt-4 text-lg font-bold text-white">{pain.title}</h3>
                <p className="mt-2 text-sm text-gray-400 leading-relaxed">{pain.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Quote */}
        <div className="mt-16 max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl font-semibold text-gray-300 leading-relaxed">
            "The Chinese restaurant doesn't use DevCore —{' '}
            <span className="text-red-brand">the agency that built the restaurant's app does.</span>"
          </blockquote>
          <p className="mt-3 text-sm text-gray-500">DevCore is built for software teams, not end consumers.</p>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-brand to-transparent opacity-60" />
    </section>
  );
}
