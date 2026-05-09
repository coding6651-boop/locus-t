export function Hero() {
  return (
    <header className="relative min-h-screen flex items-center justify-center px-5 md:px-6 pt-20 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,0,0,0.03)_0%,transparent_60%)]" />

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <h1 className="text-[2.8rem] sm:text-[3.5rem] md:text-[6rem] lg:text-[7rem] font-bold tracking-tightest text-black mb-4 md:mb-6 leading-[0.95]">
          Your AI Agent
          <br />
          <span className="text-gray-200">for the Terminal</span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-gray-400 max-w-2xl mx-auto mb-10 md:mb-12 leading-relaxed px-2">
          An agentic coding assistant that understands your codebase, runs commands,
          edits files, and orchestrates complex workflows —{' '}
          <span className="text-gray-500 font-medium">entirely on your machine.</span>
        </p>

        <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
          <a
            href="#terminal"
            className="btn-ios text-sm md:text-base px-6 md:px-8 py-3 md:py-3.5"
          >
            <svg className="w-4 md:w-5 h-4 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            See it in action
          </a>
          <a
            href="#features"
            className="btn-ios-outline text-sm md:text-base px-6 md:px-8 py-3 md:py-3.5"
          >
            Explore features
            <svg className="w-3.5 md:w-4 h-3.5 md:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </a>
        </div>

        <div className="mt-14 md:mt-20 max-w-xs sm:max-w-sm md:max-w-2xl mx-auto opacity-40">
          <div className="bg-gray-50 border border-gray-100/80 rounded-xl md:rounded-2xl p-3 md:p-4 font-mono text-[10px] md:text-xs leading-5 md:leading-6 text-left overflow-x-auto whitespace-nowrap md:whitespace-normal">
            <span className="text-gray-300">$ </span>
            <span className="text-gray-500">locus ask </span>
            <span className="text-gray-400">"explain this codebase"</span>
            <br className="hidden md:block" />
            <span className="text-gray-300">$ </span>
            <span className="text-gray-300">_</span>
          </div>
        </div>
      </div>
    </header>
  )
}
