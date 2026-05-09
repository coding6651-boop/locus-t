import { Link } from "react-router-dom";

const productLinks = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Changelog", href: "/changelog" },
] as const;

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-black/5 py-10 sm:py-12 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <img src="/locus-logo.png" alt="Locus" className="w-6 h-6" />
              <span className="font-semibold text-black text-sm">Locus</span>
            </div>
            <p className="text-black/25 text-xs">
              Offline-first AI coding terminal.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-black mb-3">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((link) =>
                link.href.startsWith("/changelog") ? (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-black/30 hover:text-black text-xs transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-black/30 hover:text-black text-xs transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>
        </div>
        <div className="border-t border-black/5 pt-5 flex justify-between items-center gap-3">
          <span className="text-black/20 text-xs">
            &copy; {currentYear} Locus
          </span>
          <p className="text-black/20 text-xs">
            Built for developers who ship.
          </p>
        </div>
      </div>
    </footer>
  );
}
