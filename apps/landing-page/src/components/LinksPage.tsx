interface Props {
  onBack: () => void;
}

const LINKS = [
  {
    label: 'GitHub',
    sublabel: 'Browse the source code',
    href: 'https://github.com/agmada-asa/devclaw',
    bg: '#0A0A0A',
    hover: '#1a1a1a',
    border: '#333',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
    textColor: 'text-white',
  },
  {
    label: 'Telegram',
    sublabel: 'Message our bot',
    href: 'https://t.me/DevClawBot',
    bg: '#229ED9',
    hover: '#1a8bbf',
    border: '#1a8bbf',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    textColor: 'text-white',
  },
  {
    label: 'WhatsApp',
    sublabel: 'Chat on WhatsApp',
    href: 'https://wa.me/message/devclaw',
    bg: '#25D366',
    hover: '#1cb955',
    border: '#1cb955',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
      </svg>
    ),
    textColor: 'text-white',
  },
];

export default function LinksPage({ onBack }: Props) {
  return (
    <div className="h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6 py-8 overflow-hidden">

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-6 left-6 flex items-center gap-2 text-white/40 hover:text-white/80 text-sm font-medium transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
        </svg>
        Back
      </button>

      {/* Header */}
      <div className="flex flex-col items-center gap-3 mb-6">
        <div className="w-14 h-14 bg-red-brand rounded-2xl flex items-center justify-center shadow-lg shadow-red-brand/40">
          <span className="text-white font-black font-mono text-xl">DC</span>
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          Dev<span className="text-red-brand">Claw</span>
        </h1>
        <p className="text-white/40 text-sm">Find us everywhere</p>
      </div>

      {/* Link buttons */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            style={{ backgroundColor: link.bg, borderColor: link.border }}
            className={`
              group flex flex-col items-center justify-center gap-2 w-full px-6 py-5 rounded-2xl border
              ${link.textColor} font-semibold
              hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]
              transition-all duration-200 shadow-lg
            `}
          >
            <span className="flex-shrink-0">{link.icon}</span>
            <div className="text-center">
              <p className="text-base font-bold">{link.label}</p>
              <p className="text-xs opacity-70">{link.sublabel}</p>
            </div>
          </a>
        ))}
      </div>

      <p className="mt-6 text-xs text-white/20 text-center">
        Powered by Z.AI GLM · DevClaw
      </p>
    </div>
  );
}
