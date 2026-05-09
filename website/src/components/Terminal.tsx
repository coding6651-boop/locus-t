export function Terminal() {
  return (
    <section id="terminal" className="py-20 md:py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title gradient-text mb-4">Interactive Terminal</h2>
          <p className="text-white/40 text-lg max-w-2xl mx-auto">
            A readline-based CLI that feels like a native terminal. Chat with the AI, run commands,
            and edit files — all without leaving your keyboard.
          </p>
        </div>

        <div className="terminal-window max-w-4xl mx-auto">
          <div className="terminal-header">
            <div className="terminal-dot bg-red-500/60" />
            <div className="terminal-dot bg-yellow-500/60" />
            <div className="terminal-dot bg-green-500/60" />
            <span className="text-xs text-white/20 ml-2 font-mono">locus — session</span>
          </div>
          <div className="p-5 md:p-8 font-mono text-sm leading-7">
            <div className="text-white/40">Locus v0.1.0 — Local AI Coding Terminal</div>
            <div className="text-white/40">Type <span className="text-white/60">/help</span> for available commands.</div>
            <div className="mt-4 text-white/40">{'>'} What does the auth module do?</div>
            <div className="text-white/70 mt-1">
              The auth module handles license activation and verification. It includes:
            </div>
            <div className="text-white/70">
              • Ed25519 signature verification via <span className="code-inline">crypto.subtle</span>
            </div>
            <div className="text-white/70">
              • Multi-platform device fingerprinting (Windows reg, Linux DMI, macOS ioreg)
            </div>
            <div className="text-white/70">
              • Atomic file writes for license persistence at <span className="code-inline">~/.locus/license.lic</span>
            </div>
            <div className="text-white/70">
              • Retry logic with exponential backoff for activation
            </div>
            <div className="mt-4">
              <span className="text-green-400/80 font-medium">$ </span>
              <span className="text-white/70">locus activate LIVE-ABCD-1234</span>
              <span className="inline-block w-2 h-4 bg-white/60 ml-0.5 animate-cursor-blink" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
