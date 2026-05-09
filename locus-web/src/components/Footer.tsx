export function Footer() {
  return (
    <footer className="py-12 md:py-16 px-5 md:px-6 border-t border-gray-100/50">
      <div className="max-w-sm mx-auto text-center">
        <img src="/locus-logo.png" alt="Locus" className="w-8 md:w-10 h-8 md:h-10 mx-auto mb-5 md:mb-6" />

        <h2 className="text-xl md:text-3xl font-bold text-black mb-2 md:mb-3 tracking-tight">
          Ready to code with AI?
        </h2>

        <p className="text-xs md:text-sm text-gray-400 mb-6 md:mb-8 leading-relaxed px-4">
          Locus runs entirely on your machine. No cloud. No data leaks. Just you, your terminal, and AI.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a href="#" className="btn-ios text-xs md:text-sm px-5 md:px-8 py-2.5 md:py-3">
            Get a License
          </a>
          <a href="#terminal" className="btn-ios-outline text-xs md:text-sm px-5 md:px-8 py-2.5 md:py-3">
            Watch the demo
          </a>
        </div>

        <div className="mt-10 md:mt-12 text-[10px] md:text-xs text-gray-300">
          &copy; {new Date().getFullYear()} Locus. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
