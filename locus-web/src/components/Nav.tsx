import { useState } from 'react'

export function Nav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-gray-100/50">
      <div className="max-w-6xl mx-auto px-5 md:px-6 h-16 flex items-center justify-between">
        <a href="#" className="flex items-center gap-3">
          <img src="/locus-logo.png" alt="Locus" className="w-8 md:w-9 h-8 md:h-9" />
          <span className="text-sm md:text-base font-semibold text-black tracking-tight">Locus</span>
        </a>

        <button className="md:hidden p-2 text-gray-500 hover:text-black" onClick={() => setOpen(!open)} aria-label="Menu">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {open ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>

        <div className="hidden md:flex items-center gap-8">
          <a href="#how-it-works" className="link-nav">How it works</a>
          <a href="#features" className="link-nav">Features</a>
          <a href="#" className="btn-pill">Get a License</a>
        </div>
      </div>

      {open && (
        <div className="md:hidden bg-white/95 backdrop-blur-xl border-b border-gray-100 px-5 pb-5 pt-2 space-y-3">
          <a href="#how-it-works" className="block text-sm text-gray-600 hover:text-black py-2" onClick={() => setOpen(false)}>How it works</a>
          <a href="#features" className="block text-sm text-gray-600 hover:text-black py-2" onClick={() => setOpen(false)}>Features</a>
          <a href="#" className="block text-center bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-all">Get a License</a>
        </div>
      )}
    </nav>
  )
}
