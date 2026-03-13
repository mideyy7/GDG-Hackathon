import CrabSVG from './CrabSVG';

interface Props {
  onBack: () => void;
  onGetStarted: () => void;
}

const PIPELINE_STEPS = [
  {
    step: '01',
    phase: 'Intake',
    title: 'Describe',
    body: 'Send a message on Telegram or WhatsApp. No tickets, no PRs, no context switching.',
    model: null,
    accent: 'border-white/10',
    dot: 'bg-white/30',
  },
  {
    step: '02',
    phase: 'Planning',
    title: 'Analyze',
    body: 'The Planner agent reads the full repository tree, understands your architecture, and produces a precise plan.',
    model: 'glm-4-long',
    accent: 'border-brand-800/40',
    dot: 'bg-brand',
  },
  {
    step: '03',
    phase: 'Approval',
    title: 'Approve',
    body: 'Review the architecture plan. Only after approval does any code get written. You stay in control.',
    model: null,
    accent: 'border-white/10',
    dot: 'bg-white/30',
  },
  {
    step: '04',
    phase: 'Generation',
    title: 'Generate',
    body: 'The Generator agent reasoning through each patch before committing it across affected files.',
    model: 'glm-4.7-flash',
    accent: 'border-brand-800/40',
    dot: 'bg-brand',
  },
  {
    step: '05',
    phase: 'Review',
    title: 'Review',
    body: 'A second Reviewer agent independently checks the code. If it raises issues, the Generator rewrites automatically.',
    model: 'glm-4.7-flash',
    accent: 'border-brand-800/40',
    dot: 'bg-brand',
  },
  {
    step: '06',
    phase: 'Delivery',
    title: 'Deliver',
    body: 'DevCore pushes the approved code to a feature branch, opens a pull request with a diff, and sends you the link.',
    model: null,
    accent: 'border-brand-800/40',
    dot: 'bg-brand',
  },
];

const MODEL_TABLE = [
  { role: 'Architecture Planner', model: 'glm-4-long', path: 'OpenRouter', why: '128k context — reads entire repos', color: 'text-sky-400' },
  { role: 'Workflow Orchestrator', model: 'glm-4.7', path: 'OpenRouter', why: 'Complex multi-step reasoning', color: 'text-violet-400' },
  { role: 'Code Generator', model: 'glm-4.7-flash', path: 'Direct Z.AI API', why: 'Fast, high-quality code with native CoT', color: 'text-emerald-400' },
  { role: 'Code Reviewer', model: 'glm-4.7-flash', path: 'Direct Z.AI API', why: 'Independent quality gate per iteration', color: 'text-emerald-400' },
  { role: 'Frontend Generator', model: 'glm-4.7-flash', path: 'Direct Z.AI API', why: 'Specialised UI/CSS/React generation', color: 'text-amber-400' },
  { role: 'Backend Generator', model: 'glm-4.7-flash', path: 'Direct Z.AI API', why: 'Specialised API/DB/service generation', color: 'text-amber-400' },
];

const STATS = [
  { value: '6', label: 'GLM model roles' },
  { value: '3×', label: 'Max review iterations' },
  { value: '128k', label: 'Context window' },
  { value: '2', label: 'Messaging channels' },
];

const CHAT_MESSAGES = [
  { from: 'user', text: 'The login button is broken on mobile Safari 🐛' },
  { from: 'bot', text: '✅ Issue #47 created in your repo.' },
  { from: 'bot', text: '🏗️ Architecture plan ready — 2 files affected. Approve to start?' },
  { from: 'user', text: '/approve' },
  { from: 'bot', text: '🤖 Generator + Reviewer agents working...' },
  { from: 'bot', text: '🎉 PR #48 opened — reviewed, documented, ready to merge.' },
];

export default function AboutPage({ onBack, onGetStarted }: Props) {
  return (
    <div className="bg-[#050505] min-h-screen text-white relative">
      <div className="grain-overlay" aria-hidden="true" />

      {/* Background glow lines for high-tech feel */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#FF5A20 1px, transparent 1px), linear-gradient(to right, #FF5A20 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
        aria-hidden="true"
      />

      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-md">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-white/80 text-xs font-mono tracking-widest transition-colors uppercase"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
          </svg>
          Back
        </button>

        <div className="flex items-center gap-1.5 hidden md:flex">
          <span className="text-white font-bold tracking-[0.15em] text-sm">DEVCORE</span>
        </div>

        <button
          onClick={onGetStarted}
          className="text-xs font-mono tracking-widest text-[#FF5A20] hover:bg-[#FF5A20]/10 border border-[#FF5A20]/40 rounded px-4 py-1.5 transition-all uppercase"
        >
          Get Started
        </button>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-24 space-y-32 relative z-10">

        {/* Hero */}
        <section className="text-center space-y-8">
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-px w-12 bg-gradient-to-r from-transparent to-brand/40" />
              <span className="text-[9px] font-mono text-[#FF5A20] tracking-[0.5em] uppercase px-2 py-1 rounded bg-[#FF5A20]/10 border border-[#FF5A20]/20">Now In Private Beta</span>
              <div className="h-px w-12 bg-gradient-to-l from-transparent to-brand/40" />
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white tracking-widest uppercase my-4" style={{ textShadow: '0 0 60px rgba(255,90,32,0.1)' }}>
              Scale to any<br /><span className="text-[#FF5A20]">codebase.</span>
            </h1>
            <p className="text-white/45 text-base md:text-xl max-w-2xl mx-auto leading-relaxed font-light tracking-wide">
              DevCore is a multi-agent AI system that turns a plain-language description into a real GitHub pull request in minutes.
            </p>
          </div>

          {/* Demos Side by Side */}
          <div className="grid lg:grid-cols-2 gap-12 mt-20 text-left items-center pt-8">
            {/* Phone Chat UI */}
            <div className="relative group">
              {/* Decorative glow */}
              <div className="absolute -inset-4 bg-[#FF5A20]/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="relative bg-[#0A0A0A] border border-white/10 rounded-[2.5rem] p-3 shadow-2xl hover:border-[#FF5A20]/30 transition-colors duration-500">
                {/* Notch */}
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-20 h-6 bg-black rounded-b-xl rounded-t-sm z-20" />

                {/* Screen content */}
                <div className="bg-[#121212] overflow-hidden rounded-[2rem] h-[500px] flex flex-col relative z-10">
                  {/* Telegram header */}
                  <div className="bg-[#2AABEE]/10 border-b border-[#2AABEE]/20 px-4 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#2AABEE] flex items-center justify-center shadow-[0_0_15px_rgba(42,171,238,0.5)]">
                      <span className="text-white font-bold text-xs">DC</span>
                    </div>
                    <div>
                      <p className="text-white font-semibold text-sm tracking-wide">DevCore Bot</p>
                      <p className="text-[#2AABEE] text-[10px] tracking-widest font-mono uppercase">online</p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 px-4 py-6 flex flex-col gap-4 overflow-hidden relative">
                    <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-[#121212] to-transparent z-10" />
                    {CHAT_MESSAGES.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} animate-fade-up`}
                        style={{ animationDelay: `${i * 0.4}s`, opacity: 0 }}
                      >
                        <div
                          className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-lg ${msg.from === 'user'
                            ? 'bg-gradient-to-br from-[#2AABEE] to-[#1e8cc7] text-white rounded-br-sm'
                            : 'bg-white/[0.05] border border-white/[0.05] text-white/90 rounded-bl-sm backdrop-blur-sm'
                            }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#121212] to-transparent z-10" />
                  </div>

                  {/* Input bar */}
                  <div className="bg-black/50 px-4 py-3 flex items-center gap-3 border-t border-white/5 backdrop-blur-md">
                    <div className="flex-1 bg-white/[0.05] border border-white/10 rounded-full px-4 py-2 text-xs text-white/30 font-light">
                      Message DevCore Bot...
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#2AABEE] flex items-center justify-center opacity-80 cursor-not-allowed">
                      <svg className="w-3.5 h-3.5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating PR Opened badge */}
              <div className="absolute -bottom-4 right-8 bg-white text-black font-semibold text-xs px-4 py-2 rounded-full shadow-[0_10px_30px_rgba(255,255,255,0.2)] flex items-center gap-2 animate-float" style={{ animationDelay: '1s' }}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                PR Merged in 4m 12s
              </div>
            </div>

            {/* Code / Terminal UI */}
            <div className="relative group">
              {/* Decorative glow */}
              <div className="absolute -inset-4 bg-emerald-500/10 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

              <div className="h-[500px] border border-white/10 rounded-xl bg-[#0f0f12] overflow-hidden shadow-2xl flex flex-col hover:border-emerald-500/30 transition-colors duration-500">

                {/* File Header */}
                <div className="bg-[#18181b] border-b border-white/5 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400/80" />
                      <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                      <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                    </div>
                    <span className="text-white/40 text-xs font-mono ml-3 border border-white/10 px-2 py-0.5 rounded bg-black/20">fix-safari-auth-btn.ts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-400 text-[10px] font-mono tracking-widest uppercase border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 rounded">GLM-4.7-FLASH</span>
                  </div>
                </div>

                {/* Editor Content */}
                <div className="flex-1 p-5 font-mono text-[13px] leading-relaxed overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 w-10 bg-[#18181b] border-r border-white/5 flex flex-col items-end pt-5 pr-2 text-white/20 select-none text-[12px] opacity-70">
                    <div>12</div><div>13</div><div>14</div><div>15</div><div>16</div><div>17</div><div>18</div><div>19</div><div>20</div><div>21</div>
                  </div>

                  <div className="pl-8 relative z-10 text-white/70 overflow-hidden">
                    {/* Simulated typing effect block */}
                    <div className="whitespace-pre h-full">
                      <span className="text-white/40">  // Wait for session init safely</span>
                      <span className="text-violet-400">  useEffect</span>(() ={'>'} {'{'}
                      <span className="text-white/40">    // iOS Safari bug mitigation</span>
                      <span className="text-red-400 opacity-50 block bg-red-900/10 -ml-2 pl-2 border-l-2 border-red-500">-   const isValid = checkAuthSync();</span>
                      <span className="text-emerald-400 block bg-emerald-900/10 -ml-2 pl-2 border-l-2 border-emerald-500">+   const checkAuth = async () ={'>'} {'{'}</span>
                      <span className="text-emerald-400 block bg-emerald-900/10 -ml-2 pl-2 border-l-2 border-emerald-500">+     const state = await getSession();</span>
                      <span className="text-emerald-400 block bg-emerald-900/10 -ml-2 pl-2 border-l-2 border-emerald-500">+     setIsValid(state.current);</span>
                      <span className="text-emerald-400 block bg-emerald-900/10 -ml-2 pl-2 border-l-2 border-emerald-500">+   {'}'};</span>
                      <span className="text-emerald-400 block bg-emerald-900/10 -ml-2 pl-2 border-l-2 border-emerald-500">+   void checkAuth();</span>

                      {'}'}, [<span className="text-sky-400">authProvider</span>]);

                      <span className="text-violet-400">return</span> (
                      <span className="text-sky-400">    {'<Button'}</span>
                      <span className="text-yellow-200">      variant=</span><span className="text-emerald-300">"primary"</span>
                      <span className="text-yellow-200">      disabled=</span>{'{'}<span className="text-red-300">!isValid</span>{'}'}
                      <span className="text-sky-400">    {'>'}</span>
                    </div>

                    {/* Animated cursor terminal */}
                    <div className="absolute bottom-4 left-8 pt-4 border-t border-white/10 w-[80%] flex items-center gap-2">
                      <span className="text-xs text-white/30">$</span>
                      <span className="text-xs text-white/60">git commit -m "fix(auth): resolve async race condition on safari"</span>
                      <span className="w-1.5 h-3.5 bg-white/70 animate-pulse ml-0.5"></span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Status floating card */}
              <div className="absolute top-1/2 -left-6 z-30 bg-black/90 backdrop-blur-md border border-white/10 rounded-lg p-3 shadow-2xl flex items-center gap-3 w-48 animate-float" style={{ animationDelay: '2s' }}>
                <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse"></div>
                <div className="flex flex-col">
                  <span className="text-white/80 font-mono text-[10px]">REVIEW LOOP 2/3</span>
                  <span className="text-white/40 text-[9px] uppercase tracking-wider">Agents syncing...</span>
                </div>
              </div>
            </div>

          </div>


          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-20">
            {STATS.map((s) => (
              <div key={s.label} className="border border-white/[0.08] rounded-xl p-4 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <p className="text-3xl font-thin text-white" style={{ textShadow: '0 0 20px rgba(255,90,32,0.3)' }}>{s.value}</p>
                <p className="text-xs text-white/40 font-mono tracking-wider mt-1 uppercase">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pipeline */}
        <section className="space-y-6 pt-20">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#FF5A20]/40" />
            <span className="text-[9px] font-mono text-[#FF5A20] tracking-[0.5em] uppercase">The Pipeline</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-widest uppercase mb-12">How it works</h2>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 border-t border-white/5 border-l">
            {PIPELINE_STEPS.map((s, index) => (
              <div
                key={s.step}
                className={`relative flex flex-col p-8 border-b border-r border-white/5 hover:bg-white/[0.01] transition-colors`}
              >
                <div className="flex items-start justify-between mb-16">
                  {/* Icon or dot matching screenshot */}
                  <div className={`w-8 h-8 rounded-full border border-[#FF5A20]/40 flex items-center justify-center text-[#FF5A20]`}>
                    <div className="w-2 h-2 rounded-full bg-[#FF5A20] shadow-[0_0_8px_rgba(255,90,32,0.8)]" />
                  </div>
                  {/* Huge prominent number */}
                  <span className="text-6xl font-black text-[#151515] select-none tracking-tighter mix-blend-screen">
                    {s.step}
                  </span>
                </div>

                <div className="flex-1">
                  <span className="text-lg font-bold text-white tracking-[0.15em] uppercase mt-2 mb-4 block">{s.title}</span>
                  <p className="text-[13px] text-[#6b6b6b] leading-relaxed tracking-wide">{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* GLM Model Table */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#FF5A20]/40" />
            <span className="text-[9px] font-mono text-[#FF5A20] tracking-[0.5em] uppercase">Z.AI GLM Models</span>
          </div>
          <h2 className="text-2xl font-thin text-white tracking-widest uppercase">Six roles. One model family.</h2>
          <p className="text-white/40 text-sm max-w-lg mb-8">Every agent in DevCore runs on Z.AI's GLM model ecosystem. Each model is matched to the cognitive complexity of its role.</p>

          <div className="border border-white/[0.08] rounded-xl overflow-hidden bg-black/50 backdrop-blur-sm">
            <div className="grid grid-cols-12 text-[10px] font-mono text-white/25 tracking-widest uppercase px-5 py-3 border-b border-white/[0.06]">
              <span className="col-span-4">Role</span>
              <span className="col-span-3">Model</span>
              <span className="col-span-2">Path</span>
              <span className="col-span-3">Why</span>
            </div>
            {MODEL_TABLE.map((row, i) => (
              <div
                key={row.role}
                className={`grid grid-cols-12 px-5 py-4 text-sm items-start ${i !== MODEL_TABLE.length - 1 ? 'border-b border-white/[0.04]' : ''} hover:bg-white/[0.02] transition-colors`}
              >
                <span className="col-span-4 text-white/60 text-xs pr-2">{row.role}</span>
                <span className={`col-span-3 font-mono text-xs font-semibold ${row.color}`}>{row.model}</span>
                <span className="col-span-2 text-white/30 text-xs">{row.path}</span>
                <span className="col-span-3 text-white/35 text-xs leading-relaxed">{row.why}</span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-white/20 font-mono mt-4">
            Fallback: if OpenRouter is unavailable, all roles fall back to glm-4.7-flash via direct Z.AI API. The system never leaves the GLM family.
          </p>
        </section>

        {/* Key capabilities */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#FF5A20]/40" />
            <span className="text-[9px] font-mono text-[#FF5A20] tracking-[0.5em] uppercase">Capabilities</span>
          </div>
          <h2 className="text-2xl font-thin text-white tracking-widest uppercase mb-8">Built for production</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Agentic retry loop',
                body: 'If the Reviewer rejects generated code, the Generator rewrites automatically — up to 3 iterations per sub-task. No human intervention required.',
                icon: '↻',
                color: 'border-violet-800/40 bg-violet-950/10',
              },
              {
                title: 'Full repo context',
                body: 'GLM-4-long\'s 128k context window ingests your entire repository tree before generating a single line of code. No hallucinated file paths or wrong imports.',
                icon: '⌁',
                color: 'border-sky-800/40 bg-sky-950/10',
              },
              {
                title: 'Telegram & WhatsApp',
                body: 'Two messaging channels, one workflow. Describe tasks, approve plans, receive PR links — all without leaving the chat you\'re already in.',
                icon: '⤳',
                color: 'border-emerald-800/40 bg-emerald-950/10',
              },
              {
                title: 'Real pull requests',
                body: 'Actual pull requests on your actual repositories. Proper diffs, branch names, descriptions, and CI triggers — not simulated, not mocked.',
                icon: '⌥',
                color: 'border-red-800/40 bg-red-950/10',
              },
              {
                title: 'Human approval gate',
                body: 'You review and approve the architecture plan before any code is generated. Keeps AI-assisted development safe for production repos.',
                icon: '✓',
                color: 'border-amber-800/40 bg-amber-950/10',
              },
              {
                title: 'Domain-split agents',
                body: 'Frontend and backend code are handled by separate generator/reviewer pairs — each prompted with domain-specific context for higher quality output.',
                icon: '⊕',
                color: 'border-white/10 bg-white/[0.02]',
              },
            ].map((cap) => (
              <div key={cap.title} className={`border rounded-xl p-5 ${cap.color} hover:brightness-125 transition-all`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-lg text-white/40 font-mono">{cap.icon}</span>
                  <h3 className="text-xs font-semibold text-white/80 tracking-widest uppercase">{cap.title}</h3>
                </div>
                <p className="text-[13px] text-white/45 leading-relaxed">{cap.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="text-center space-y-6 pt-10 pb-8">
          <div className="flex items-center justify-center gap-3">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#FF5A20]/40" />
            <span className="text-[9px] font-mono text-[#FF5A20] tracking-[0.5em] uppercase">Try it now</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#FF5A20]/40" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-widest uppercase">Ready to ship faster?</h2>
          <p className="text-white/40 text-sm max-w-sm mx-auto mb-10">Connect your GitHub repo and send your first task via Telegram or WhatsApp.</p>
          <button
            onClick={onGetStarted}
            className="group inline-flex items-center gap-3 px-12 py-4 rounded bg-[#FF5A20] text-black font-bold text-sm tracking-widest hover:scale-105 active:scale-95 transition-all duration-300"
            style={{ boxShadow: '0 0 20px rgba(255,90,32,0.2)' }}
          >
            GET STARTED
            <svg className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
          <p className="mt-12 text-[10px] text-white/15 font-mono tracking-[0.3em]">POWERED BY Z.AI GLM · DEVCORE</p>
        </section>
      </div>
    </div>
  );
}
