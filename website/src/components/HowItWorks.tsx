const steps = [
  {
    number: '01',
    title: 'Install & Setup',
    description: 'Install via npm and run llama.cpp server with your model of choice. Locus connects automatically.',
    code: 'npm install -g locus\nllama-server -m model.gguf --port 8080\nlocus',
  },
  {
    number: '02',
    title: 'Activate License',
    description: 'Get a license token from the admin panel and activate with a single command.',
    code: 'locus activate LIVE-ABCD-1234',
  },
  {
    number: '03',
    title: 'Start Coding',
    description: 'Chat with the AI, run bash commands, read and edit files, search code — all from the terminal.',
    code: 'locus ask "refactor this function"\n> Analyzing src/utils/parser.ts...\n> Here is the refactored version.',
  },
  {
    number: '04',
    title: 'Manage Tokens',
    description: 'Use the web admin panel to create, monitor, and manage license tokens for your team.',
    code: 'Admin panel at packages/admin/\nLogin: admin@locus.dev',
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 md:py-32 px-6 border-t border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="section-title gradient-text mb-4">How It Works</h2>
          <p className="text-white/40 text-lg max-w-2xl mx-auto">
            From installation to activation — get started in minutes.
          </p>
        </div>

        <div className="space-y-8 md:space-y-12">
          {steps.map((step, i) => (
            <div key={step.number} className="group animate-fade-in" style={{ animationDelay: `${i * 150}ms` }}>
              <div className="flex flex-col md:flex-row gap-6 md:gap-10">
                <div className="md:w-16 flex-shrink-0">
                  <span className="text-3xl md:text-4xl font-bold text-white/10 group-hover:text-white/20 transition-colors">
                    {step.number}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-white/40 mb-4 max-w-xl">{step.description}</p>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <pre className="font-mono text-sm text-white/60 leading-6">{step.code}</pre>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
