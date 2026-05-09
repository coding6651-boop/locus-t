const reasons = [
  {
    title: 'Program Anywhere',
    description:
      '🌲 Deep in the Amazon forest. Middle of the ocean. On a 12-hour flight. No internet? No problem. Locus runs 100% offline — your terminal, your AI, wherever you are.',
  },
  {
    title: 'Tiny Hardware',
    description:
      '💻 Runs on machines with just 2GB RAM and zero GPU. Old laptop gathering dust? That\'s all you need. No cloud servers, no expensive rigs — your existing hardware is enough.',
  },
  {
    title: 'Save Your Bandwidth Forever',
    description:
      '💸 No cloud API calls, no model downloads at runtime, no data uploading. Every megabyte of bandwidth stays yours — for streaming, calls, updates, and games. Your internet, your way.',
  },
]

export function WhyLocus() {
  return (
    <section id="why-locus" className="py-16 md:py-24 lg:py-40 px-5 md:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="section-title text-3xl md:text-5xl mb-3 md:mb-4">Why Locus?</h2>
          <p className="text-sm md:text-lg text-gray-400 max-w-2xl mx-auto">
            Because great software should work anywhere, on any hardware, without asking for permission — or an internet connection.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 max-w-4xl mx-auto">
          {reasons.map((r) => (
            <div key={r.title} className="card-ios p-6 md:p-8">
              <h3 className="text-sm md:text-base font-semibold text-black mb-2 md:mb-3">{r.title}</h3>
              <p className="text-xs md:text-sm text-gray-400 leading-relaxed">{r.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
