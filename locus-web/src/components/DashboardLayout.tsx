import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { label: "Overview", path: "/dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { label: "Requests", path: "/dashboard/requests", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
  { label: "Account", path: "/dashboard/account", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
] as const;

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <header className="fixed top-0 left-0 right-0 z-40 backdrop-blur-2xl bg-white/60 border-b border-black/5">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/" className="flex items-center gap-2">
            <img src="/locus-logo.png" alt="Locus" className="w-5 h-5" />
            <span className="font-semibold text-black text-sm">Locus</span>
            <span className="text-black/20 text-xs hidden sm:inline">/ dashboard</span>
          </Link>

          <button
            onClick={() => navigate("/")}
            className="text-xs text-black/40 hover:text-black transition-colors"
          >
            Exit
          </button>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-2xl bg-white/70 border-t border-black/5 md:hidden">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center gap-0.5 min-w-[64px] h-full transition-colors ${
                  isActive ? "text-black" : "text-black/35"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2 : 1.5} d={item.icon} />
                </svg>
                <span className={`text-[10px] ${isActive ? "font-medium" : ""}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="flex pt-14">
        <aside className="hidden md:flex flex-col w-56 min-h-[calc(100vh-3.5rem)] border-r border-black/5 p-4 fixed left-0 top-14 bottom-0 bg-white/40 backdrop-blur-xl">
          <nav className="space-y-1 flex-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  currentPath === item.path
                    ? "bg-black text-white"
                    : "text-black/50 hover:text-black hover:bg-black/5"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-black/40 hover:text-black hover:bg-black/5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </aside>

        <main className="flex-1 md:ml-56 px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8 pb-24 md:pb-8">
          <div className="max-w-2xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
