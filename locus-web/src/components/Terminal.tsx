import { useState, useEffect } from "react";
import { FadeUp } from "./Animations";

const TYPING_LINES = [
  '$ locus ask "explain this codebase"',
  "> Analyzing repository structure...",
  "> Found 47 TypeScript files across 12 modules.",
  "> The project is an offline AI coding terminal",
  "> powered by local LLM inference.",
];

export function Terminal() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);
  const [lineDone, setLineDone] = useState(false);

  useEffect(() => {
    if (visibleLines >= TYPING_LINES.length) return;
    const line = TYPING_LINES[visibleLines];
    if (!line) return;
    if (currentChar < line.length) {
      const t = setTimeout(() => setCurrentChar((c) => c + 1), 30 + Math.random() * 20);
      return () => clearTimeout(t);
    }
    if (!lineDone) {
      setLineDone(true);
      const t = setTimeout(() => {
        setVisibleLines((v) => v + 1);
        setCurrentChar(0);
        setLineDone(false);
      }, 400);
      return () => clearTimeout(t);
    }
  }, [visibleLines, currentChar, lineDone]);

  return (
    <section id="terminal" className="py-16 sm:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <FadeUp>
          <div className="text-center mb-10 sm:mb-14">
            <div className="section-label">Terminal</div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-black tracking-tight">
              AI Agent in Your Terminal
            </h2>
            <p className="mt-2 sm:mt-3 text-black/40 max-w-lg text-xs sm:text-sm leading-relaxed mx-auto">
              Type what you need in plain language. Locus understands, acts, and delivers — right inside your terminal.
            </p>
          </div>
        </FadeUp>

        <FadeUp>
          <div className="max-w-3xl mx-auto glass-dark rounded-2xl overflow-hidden shadow-[0_24px_48px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-white/5 border-b border-white/10">
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/20" />
              <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white/20" />
              <span className="ml-2 sm:ml-3 text-[10px] sm:text-xs text-white/30 font-mono">locus — terminal</span>
            </div>
            <div className="p-4 sm:p-6 font-mono text-[11px] sm:text-sm leading-6 sm:leading-7 min-h-[180px] sm:min-h-[220px]">
              {TYPING_LINES.slice(0, visibleLines).map((line, i) => (
                <div key={i}>
                  {line.startsWith("$") ? (
                    <span>
                      <span className="text-white/40">{line.slice(0, 6)}</span>
                      <span className="text-white">{line.slice(6)}</span>
                    </span>
                  ) : line.startsWith(">") ? (
                    <span className="text-white/40">{line}</span>
                  ) : (
                    <span className="text-white/60">{line}</span>
                  )}
                </div>
              ))}
              {visibleLines < TYPING_LINES.length && (
                <div>
                  {TYPING_LINES[visibleLines]?.startsWith("$") ? (
                    <span>
                      <span className="text-white/40">
                        {TYPING_LINES[visibleLines].slice(0, 6)}
                      </span>
                      <span className="text-white">
                        {TYPING_LINES[visibleLines].slice(6, 6 + currentChar)}
                      </span>
                    </span>
                  ) : (
                    <span className="text-white/40">
                      {TYPING_LINES[visibleLines]?.slice(0, currentChar)}
                    </span>
                  )}
                  <span className="inline-block w-1.5 sm:w-2 h-3 sm:h-4 bg-white ml-0.5 animate-cursor-blink" />
                </div>
              )}
            </div>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
