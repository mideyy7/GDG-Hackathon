const INCLUDED = [
  'Unlimited tasks via Telegram or WhatsApp',
  'Full Generator + Reviewer agent pair',
  'Architecture plan before every task',
  'Auto-documented pull requests (TSDoc + CHANGELOG)',
  'Private inference via Venice.ai — zero code logging',
  'GitHub issue creation and deduplication',
  'Cross-session codebase memory',
  'Priority support via Telegram',
];

export default function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="section-label mx-auto mb-4 w-fit">Pricing</div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight max-w-xl mx-auto leading-tight">
            One plan.{' '}
            <span className="gradient-text">No surprises.</span>
          </h2>
          <p className="mt-4 text-gray-500 text-lg">
            Everything you need to ship faster than your competitors.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8 items-start">
          {/* Main card */}
          <div className="lg:col-span-3 bg-white border-2 border-red-brand rounded-3xl overflow-hidden shadow-xl shadow-red-brand/10">
            {/* Header */}
            <div className="bg-red-brand px-8 py-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-red-100 text-sm font-semibold uppercase tracking-widest">DevCore Pro</p>
                  <p className="mt-1 text-white text-4xl font-black">Contact Us</p>
                  <p className="text-red-100 text-sm mt-1">for custom pricing</p>
                </div>
                <div className="bg-white/20 rounded-2xl px-4 py-2 text-white text-sm font-bold">
                  Early Bird
                </div>
              </div>
            </div>

            {/* Features list */}
            <div className="px-8 py-8">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Everything included</p>
              <ul className="flex flex-col gap-3">
                {INCLUDED.map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-red-50 text-red-brand flex items-center justify-center text-xs font-bold">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <a
                href="https://t.me/DevCoreBot"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full justify-center mt-8 py-4 text-base"
              >
                Start on Telegram — it's free to try
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <p className="mt-3 text-center text-xs text-gray-400">No credit card required to try · Stripe billing when you're ready</p>
            </div>
          </div>

          {/* Right column — context */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Comparison callout */}
            <div className="card border-gray-100">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">How it compares</p>
              {[
                { label: 'Junior engineer', cost: '£50k+/yr', note: '3-month onboard' },
                { label: 'Second agency', cost: '£10k/project', note: 'Delivers late' },
                { label: 'Devin', cost: '$500/mo', note: 'Logs your code' },
                { label: 'DevCore', cost: 'Custom', highlight: true, note: 'Private, reviewed, documented' },
              ].map((c, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2.5 border-b last:border-0 border-gray-50 ${
                    c.highlight ? 'text-red-brand font-semibold' : 'text-gray-600'
                  }`}
                >
                  <span className="text-sm">{c.label}</span>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${c.highlight ? 'text-red-brand' : 'text-gray-900'}`}>{c.cost}</span>
                    <p className={`text-xs ${c.highlight ? 'text-red-400' : 'text-gray-400'}`}>{c.note}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Z.AI GLM callout */}
            <div className="bg-gray-950 rounded-2xl p-6 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Powered by</p>
              <p className="font-bold text-lg">Z.AI GLM Series</p>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Three specialised GLM models handle different cognitive tasks — planning, generation, and review — each matched to the right level of reasoning depth.
              </p>
              <span className="mt-3 inline-block text-xs text-red-400 font-semibold">GLM-4.7-flash · GLM-4.7 · glm-z1 →</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
