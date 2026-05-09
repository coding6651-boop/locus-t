import { motion } from "framer-motion";

const changelog = [
  { version: "1.0.0", date: "May 2026", title: "Initial Release", items: ["First public release of Locus", "Offline-first agentic coding assistant", "Ed25519 license activation system", "Support for local LLM backends (Ollama, LM Studio)", "Plan and Build agent modes"] },
  { version: "0.9.0", date: "April 2026", title: "Beta Release", items: ["Beta preview for early adopters", "Basic terminal workflow", "Codebase analysis and understanding", "File editing and management"] },
];

export default function Changelog() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <a href="/" className="inline-flex items-center gap-2 text-black/40 hover:text-black transition-colors mb-8 text-xs">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </a>

          <div className="mb-10">
            <h1 className="text-2xl sm:text-3xl font-bold text-black tracking-tight">Changelog</h1>
            <p className="mt-2 text-xs sm:text-sm text-black/40">All releases and updates for Locus.</p>
          </div>

          <div className="space-y-8">
            {changelog.map((release) => (
              <div key={release.version} className="glass-card rounded-2xl p-5 sm:p-6">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-black">{release.title}</h2>
                    <p className="text-[10px] sm:text-xs text-black/30 mt-0.5 font-mono">v{release.version}</p>
                  </div>
                  <span className="text-[10px] sm:text-xs text-black/30">{release.date}</span>
                </div>
                <ul className="space-y-1.5">
                  {release.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs sm:text-sm text-black/50">
                      <svg className="w-3 h-3 mt-0.5 shrink-0 text-black/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
