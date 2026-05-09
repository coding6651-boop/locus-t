import { useState, useEffect } from 'react'

const TYPING_LINES = [
  '$ locus ask "explain this codebase"',
  '> Analyzing repository structure...',
  '> Found 47 TypeScript files across 12 modules.',
  '> The project is an offline AI coding terminal',
  '> powered by local LLM inference.',
]

export function Hero() {
  const [visibleLines, setVisibleLines] = useState(0)
  const [currentChar, setCurrentChar] = useState(0)
  const [lineDone, setLineDone] = useState(false)

  useEffect(() => {
    if (visibleLines >= TYPING_LINES.length) return

    const line = TYPING_LINES[visibleLines]
    if (!line) return

    if (currentChar < line.length) {
      const t = setTimeout(() => setCurrentChar((c) => c + 1), 30 + Math.random() * 20)
      return () => clearTimeout(t)
    }

    if (!lineDone) {
      setLineDone(true)
      const t = setTimeout(() => {
        setVisibleLines((v) => v + 1)
        setCurrentChar(0)
        setLineDone(false)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [visibleLines, currentChar, lineDone])

  return (
    <header className="relative min-h-screen flex items-center justify-center overflow-hidden px-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06)_0%,transparent_60%)]" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs text-white/50 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          v0.1.0 — Open Source
        </div>

        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
          <span className="gradient-text">Local AI</span>
          <br />
          <span className="text-white">Coding Terminal</span>
        </h1>

        <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed">
          An offline, LLM-powered coding assistant that runs entirely on your machine.
          No cloud dependency. Total privacy.
        </p>

        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href="#terminal"
            className="inline-flex items-center gap-2 bg-white text-black font-semibold px-8 py-3.5 rounded-2xl hover:bg-white/90 transition-all active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            See it in action
          </a>
          <a
            href="#features"
            className="inline-flex items-center gap-2 text-white/60 hover:text-white font-medium px-8 py-3.5 rounded-2xl border border-white/10 hover:border-white/20 transition-all"
          >
            Explore features
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>
      </div>

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 hidden md:block">
        <div className="terminal-window max-w-2xl">
          <div className="terminal-header">
            <div className="terminal-dot bg-red-500/60" />
            <div className="terminal-dot bg-yellow-500/60" />
            <div className="terminal-dot bg-green-500/60" />
            <span className="text-xs text-white/20 ml-2 font-mono">locus — terminal</span>
          </div>
          <div className="p-5 font-mono text-sm leading-7 text-left min-h-[180px]">
            {TYPING_LINES.slice(0, visibleLines).map((line, i) => (
              <div key={i} className="animate-fade-in">
                {line.startsWith('$') ? (
                  <span>
                    <span className="text-green-400/80 font-medium">{line.slice(0, 6)}</span>
                    <span className="text-white/70">{line.slice(6)}</span>
                  </span>
                ) : (
                  <span className="text-white/40">{line}</span>
                )}
              </div>
            ))}
            {visibleLines < TYPING_LINES.length && (
              <div className="animate-fade-in">
                {TYPING_LINES[visibleLines]?.startsWith('$') ? (
                  <span>
                    <span className="text-green-400/80 font-medium">
                      {TYPING_LINES[visibleLines].slice(0, 6)}
                    </span>
                    <span className="text-white/70">
                      {TYPING_LINES[visibleLines].slice(6, 6 + currentChar)}
                    </span>
                  </span>
                ) : (
                  <span className="text-white/40">
                    {TYPING_LINES[visibleLines]?.slice(0, currentChar)}
                  </span>
                )}
                <span className="inline-block w-2 h-4 bg-white/60 ml-0.5 animate-cursor-blink" />
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
