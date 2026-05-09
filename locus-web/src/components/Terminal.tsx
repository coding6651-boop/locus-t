import { useState, useEffect } from 'react'

const TYPING_LINES = [
  '$ locus ask "explain this codebase"',
  '> Analyzing repository structure...',
  '> Found 47 TypeScript files across 12 modules.',
  '> The project is an offline AI coding terminal',
  '> powered by local LLM inference.',
]

export function Terminal() {
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
    <section id="terminal" className="py-16 md:py-24 lg:py-40 px-5 md:px-6 bg-gray-50/40">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="section-title text-3xl md:text-5xl mb-3 md:mb-4">AI Agent in Your Terminal</h2>
          <p className="text-sm md:text-lg text-gray-400 max-w-2xl mx-auto">
            Type what you need in plain language. Locus understands, acts, and delivers — right inside your terminal.
          </p>
        </div>

        <div className="max-w-3xl mx-auto bg-white rounded-2xl md:rounded-3xl border border-gray-100/80 overflow-hidden shadow-[0_4px_16px_0_rgb(0_0_0/0.04),0_1px_3px_0_rgb(0_0_0/0.02)]">
          <div className="flex items-center gap-1.5 md:gap-2 px-4 md:px-5 py-2.5 md:py-3.5 bg-gray-900 border-b border-gray-800">
            <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-red-500/80" />
            <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-yellow-500/80" />
            <div className="w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-green-500/80" />
            <span className="text-[10px] md:text-xs text-gray-500 ml-2 md:ml-3 font-mono">locus — terminal</span>
          </div>
          <div className="p-4 md:p-8 bg-gray-950 font-mono text-[11px] md:text-sm leading-6 md:leading-7 min-h-[180px] md:min-h-[220px] overflow-x-auto">
            {TYPING_LINES.slice(0, visibleLines).map((line, i) => (
              <div key={i} className="animate-fade-in">
                {line.startsWith('$') ? (
                  <span>
                    <span className="text-gray-500 font-medium">{line.slice(0, 6)}</span>
                    <span className="text-gray-200">{line.slice(6)}</span>
                  </span>
                ) : line.startsWith('>') ? (
                  <span className="text-gray-400">{line}</span>
                ) : (
                  <span className="text-gray-300">{line}</span>
                )}
              </div>
            ))}
            {visibleLines < TYPING_LINES.length && (
              <div className="animate-fade-in">
                {TYPING_LINES[visibleLines]?.startsWith('$') ? (
                  <span>
                    <span className="text-gray-500 font-medium">
                      {TYPING_LINES[visibleLines].slice(0, 6)}
                    </span>
                    <span className="text-gray-200">
                      {TYPING_LINES[visibleLines].slice(6, 6 + currentChar)}
                    </span>
                  </span>
                ) : (
                  <span className="text-gray-400">
                    {TYPING_LINES[visibleLines]?.slice(0, currentChar)}
                  </span>
                )}
                <span className="inline-block w-1.5 md:w-2 h-3 md:h-4 bg-gray-200/60 ml-0.5 animate-cursor-blink" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
