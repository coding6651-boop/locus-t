const steps = [
  {
    number: '01',
    title: 'Install & Launch',
    description:
      'Install Locus via npm, point it at your local LLM, and start the terminal. No sign-up, no account, no cloud setup.',
  },
  {
    number: '02',
    title: 'Activate Your License',
    description:
      'One-time license activation unlocks the full agentic capabilities. Use your token and you\'re set — permanently, on your machine.',
  },
  {
    number: '03',
    title: 'Code with AI',
    description:
      'Chat with the AI, refactor code, run bash commands, search files, and manage your entire workflow — all from the terminal, all offline.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 lg:py-40 px-5 md:px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10 md:mb-16">
          <h2 className="section-title text-3xl md:text-5xl mb-3 md:mb-4">Get Started in Minutes</h2>
          <p className="text-sm md:text-lg text-gray-400">From install to AI-powered coding — three simple steps.</p>
        </div>

        <div className="space-y-3 md:space-y-4">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group card-ios flex items-start gap-4 md:gap-6 p-5 md:p-8"
            >
              <span className="text-2xl md:text-4xl font-bold text-gray-100 group-hover:text-gray-300 transition-colors duration-500 leading-none mt-0.5 flex-shrink-0">
                {step.number}
              </span>
              <div className="min-w-0">
                <h3 className="text-sm md:text-lg font-semibold text-black mb-1 md:mb-1.5">{step.title}</h3>
                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
