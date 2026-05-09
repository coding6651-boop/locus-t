const layers = [
  {
    title: 'CLI Layer',
    items: ['Readline-based interactive terminal', 'Command routing & history', 'Graceful degradation'],
  },
  {
    title: 'Core Engine',
    items: ['Session lifecycle & orchestration', 'System prompt assembly', 'Context window management', 'Tool execution dispatch'],
  },
  {
    title: 'AI Inference',
    items: ['LLM client abstraction', 'Streaming with buffering', 'Token estimation & truncation', 'Provider-agnostic interface'],
  },
  {
    title: 'Tools',
    items: ['Bash execution', 'File read/write (atomic)', 'Exact-string editing', 'ripgrep search', 'Glob patterns', 'Git operations'],
  },
  {
    title: 'Auth & Licensing',
    items: ['Ed25519 verification', 'Device fingerprinting', 'License persistence', 'HTTP activation with retry'],
  },
  {
    title: 'Config & Runtime',
    items: ['File + env var config loading', 'Startup diagnostics', 'Graceful shutdown', 'Mode switching (offline/online)'],
  },
]

const stack = [
  { name: 'TypeScript', desc: 'Full type safety throughout' },
  { name: 'Node.js 22+', desc: 'ESM, WebCrypto, modern APIs' },
  { name: 'Convex', desc: 'Serverless backend + admin panel' },
  { name: 'Tailwind CSS', desc: 'Utility-first styling' },
  { name: 'llama.cpp', desc: 'Local LLM inference' },
  { name: 'React + Vite', desc: 'Admin dashboard UI' },
]

export function Architecture() {
  return (
    <section className="py-20 md:py-32 px-6 border-t border-white/5">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title gradient-text mb-4">Architecture</h2>
          <p className="text-white/40 text-lg max-w-2xl mx-auto">
            Modular design with clear separation of concerns. Each layer is independent and replaceable.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-20">
          {layers.map((layer) => (
            <div key={layer.title} className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">{layer.title}</h3>
              <ul className="space-y-2">
                {layer.items.map((item) => (
                  <li key={item} className="text-sm text-white/40 flex items-start gap-2">
                    <span className="text-white/20 mt-0.5">·</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-xl font-semibold text-white mb-8 text-center">Tech Stack</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {stack.map((s) => (
              <div key={s.name} className="text-center bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] transition-all">
                <div className="text-sm font-semibold text-white mb-1">{s.name}</div>
                <div className="text-xs text-white/30">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
