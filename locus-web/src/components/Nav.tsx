import { useState } from "react";
import { Link, useLocation } from "react-router-dom";

interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

const homeLinks: NavLink[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
  { label: "Changelog", href: "/changelog", external: true },
];

export function Nav() {
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <nav className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4 sm:px-6">
      <div className="max-w-3xl w-full rounded-2xl backdrop-blur-2xl bg-white/40 border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <div className="flex items-center justify-between h-12 px-4 sm:px-5">
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src="/locus-logo.png" alt="Locus" className="w-6 h-6" />
            <span className="font-semibold text-black text-sm">Locus</span>
          </Link>

          <div className="hidden md:flex items-center gap-0.5">
            {isHome ? (
              <>
                {homeLinks.map((link) =>
                  link.external ? (
                    <Link
                      key={link.label}
                      to={link.href}
                      className="text-black/40 hover:text-black transition-colors text-xs px-3 py-1.5 rounded-full hover:bg-black/5"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.label}
                      href={link.href}
                      className="text-black/40 hover:text-black transition-colors text-xs px-3 py-1.5 rounded-full hover:bg-black/5"
                    >
                      {link.label}
                    </a>
                  )
                )}
              </>
            ) : (
              <>
                <a href="/#how-it-works" className="text-black/40 hover:text-black transition-colors text-xs px-3 py-1.5 rounded-full hover:bg-black/5">How it works</a>
                <a href="/#features" className="text-black/40 hover:text-black transition-colors text-xs px-3 py-1.5 rounded-full hover:bg-black/5">Features</a>
                <a href="/#pricing" className="text-black/40 hover:text-black transition-colors text-xs px-3 py-1.5 rounded-full hover:bg-black/5">Pricing</a>
                <Link to="/changelog" className="text-black/40 hover:text-black transition-colors text-xs px-3 py-1.5 rounded-full hover:bg-black/5">Changelog</Link>
              </>
            )}
            <Link
              to="/login"
              className="ml-2 bg-black/80 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 hover:bg-black active:scale-95"
            >
              Get Started
            </Link>
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 transition-colors"
            aria-label="Toggle menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-black/5 rounded-b-2xl px-4 py-3 space-y-0.5">
            {isHome ? (
              <>
                {homeLinks.map((link) =>
                  link.external ? (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block text-black/40 hover:text-black transition-colors text-sm py-2 px-3 rounded-full hover:bg-black/5"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.label}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className="block text-black/40 hover:text-black transition-colors text-sm py-2 px-3 rounded-full hover:bg-black/5"
                    >
                      {link.label}
                    </a>
                  )
                )}
              </>
            ) : (
              <>
                <a href="/#how-it-works" onClick={() => setMenuOpen(false)} className="block text-black/40 hover:text-black transition-colors text-sm py-2 px-3 rounded-full hover:bg-black/5">How it works</a>
                <a href="/#features" onClick={() => setMenuOpen(false)} className="block text-black/40 hover:text-black transition-colors text-sm py-2 px-3 rounded-full hover:bg-black/5">Features</a>
                <a href="/#pricing" onClick={() => setMenuOpen(false)} className="block text-black/40 hover:text-black transition-colors text-sm py-2 px-3 rounded-full hover:bg-black/5">Pricing</a>
                <Link to="/changelog" onClick={() => setMenuOpen(false)} className="block text-black/40 hover:text-black transition-colors text-sm py-2 px-3 rounded-full hover:bg-black/5">Changelog</Link>
              </>
            )}
            <Link
              to="/login"
              onClick={() => setMenuOpen(false)}
              className="block bg-black/80 backdrop-blur-sm text-white px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 hover:bg-black active:scale-95 text-center mt-2"
            >
              Get Started
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
