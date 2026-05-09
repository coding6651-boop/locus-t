const features = [
  {
    title: 'Agentic AI',
    description:
      'Not just autocomplete. Locus understands your codebase, runs terminal commands, edits files, and orchestrates multi-step workflows — all from natural language. It acts, not just suggests.',
  },
  {
    title: 'Runs on Anything',
    description:
      'Optimized for laptops and low-spec hardware. Works with quantized models that run on as little as 4GB RAM. No GPU required. No cloud servers. Your machine is all you need.',
  },
  {
    title: '100% Offline',
    description:
      'Zero cloud dependency after setup. No internet connection required to code. Your code, your conversations, your data — never leave your machine. Ever.',
  },
  {
    title: 'Privacy by Design',
    description:
      'No telemetry, no cloud sync, no data collection, no analytics. What happens on your terminal stays on your terminal. Built for developers who take privacy seriously.',
  },
  {
    title: 'Any Model, Any Backend',
    description:
      'Bring your own model. Locus connects to any local LLM backend with zero vendor lock-in. No subscription fees. No API costs. Just your model, your way.',
  },
  {
    title: 'Natural Language to Actions',
    description:
      '"Refactor this function." "Explain this codebase." "Find the bug." "Write tests for this module." Just describe what you want and Locus handles the rest.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-16 md:py-24 lg:py-40 px-5 md:px-6 bg-gray-50/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="section-title text-3xl md:text-5xl mb-3 md:mb-4">Built for the Way You Code</h2>
          <p className="text-sm md:text-lg text-gray-400 max-w-2xl mx-auto">
            Locus brings AI-powered development to your terminal — with zero compromise on privacy, performance, or control.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((f) => (
            <div key={f.title} className="card-ios p-6 md:p-8">
              <div className="w-8 md:w-10 h-8 md:h-10 bg-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-5 text-gray-500">
                <svg className="w-4 md:w-5 h-4 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-sm md:text-base font-semibold text-black mb-1.5 md:mb-2">{f.title}</h3>
              <p className="text-xs md:text-sm text-gray-400 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
