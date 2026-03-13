const ROWS = [
  { feature: 'True multi-agent specialisation', devin: false, swe: false, dc: true },
  { feature: 'Adversarial pair code review', devin: false, swe: false, dc: true },
  { feature: 'Privacy — no code logging', devin: false, swe: false, dc: true },
  { feature: 'Open-source model stack', devin: false, swe: 'partial', dc: true },
  { feature: 'Human approval gate', devin: 'partial', swe: false, dc: true },
  { feature: 'Auto-documentation (TSDoc + CHANGELOG)', devin: false, swe: false, dc: true },
  { feature: 'Persistent cross-session memory', devin: 'partial', swe: false, dc: true },
  { feature: 'Works via Telegram / WhatsApp', devin: false, swe: false, dc: true },
  { feature: 'Self-marketing revenue loop', devin: false, swe: false, dc: true },
  { feature: 'Price', devin: '$500/mo', swe: 'CLI only', dc: 'Custom' },
];

type CellValue = boolean | string;

function Cell({ value, highlight }: { value: CellValue; highlight?: boolean }) {
  if (value === true) {
    return (
      <td className={`px-4 py-3 text-center ${highlight ? 'bg-red-brand/5' : ''}`}>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-600 text-xs font-bold">✓</span>
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-400 text-xs font-bold">✗</span>
      </td>
    );
  }
  if (value === 'partial') {
    return (
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-yellow-100 text-yellow-600 text-xs font-bold">~</span>
      </td>
    );
  }
  return (
    <td className={`px-4 py-3 text-center text-sm font-semibold ${highlight ? 'text-red-brand bg-red-brand/5' : 'text-gray-500'}`}>
      {value}
    </td>
  );
}

export default function Comparison() {
  return (
    <section id="comparison" className="py-24 bg-gray-50">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <div className="section-label mx-auto mb-4 w-fit">Comparison</div>
          <h2 className="text-4xl lg:text-5xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
            Different on every axis{' '}
            <span className="gradient-text">that matters.</span>
          </h2>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-4 py-4 text-left text-sm font-semibold text-gray-500 w-1/2">Feature</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-500">Devin</th>
                <th className="px-4 py-4 text-center text-sm font-semibold text-gray-500">SWE-Agent</th>
                <th className="px-4 py-4 text-center w-32">
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-red-brand bg-red-50 px-3 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-brand" />
                    CoreDev
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'
                    }`}
                >
                  <td className="px-4 py-3 text-sm text-gray-700 font-medium">{row.feature}</td>
                  <Cell value={row.devin} />
                  <Cell value={row.swe} />
                  <Cell value={row.dc} highlight />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-xs text-gray-400">
          CoreDev is the only tool in this space with all three: privacy-first inference, adversarial review, and a human approval gate.
        </p>
      </div>
    </section>
  );
}
