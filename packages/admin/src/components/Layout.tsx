import { useAuth } from '../hooks/useAuth'
import { LogOut, Key } from 'lucide-react'
import { useLocation } from 'react-router-dom'

export function Layout({ children }: { children: React.ReactNode }) {
  const { logout, admin } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-[#f5f5f7]">
      <aside className="fixed top-0 left-0 z-40 w-72 h-screen sidebar">
        <div className="flex flex-col h-full px-5 py-8">
          <div className="flex items-center gap-3 px-2 mb-12">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center flex-shrink-0 shadow-[0_2px_8px_0_rgb(0_0_0/0.08)]">
              <Key className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <span className="text-base font-bold text-black tracking-tight block leading-tight">Locus</span>
              <span className="text-xs font-medium text-gray-400">Admin Panel</span>
            </div>
          </div>

          <nav className="flex-1 space-y-0.5">
            <div className="text-xs font-medium text-gray-300 uppercase tracking-wider px-4 mb-3">Management</div>
            <button
              onClick={() => {}}
              className={`nav-item ${location.pathname === '/' ? 'nav-item-active' : ''}`}
            >
              <div className="w-2 h-2 rounded-full bg-current mr-4 opacity-40"></div>
              License Tokens
            </button>
          </nav>

          <div className="border-t border-gray-100/80 pt-5 space-y-4">
            {admin && (
              <div className="px-4">
                <p className="text-sm font-medium text-gray-900 truncate">{admin.name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{admin.email}</p>
              </div>
            )}
            <button onClick={logout} className="nav-item text-gray-400 hover:text-red-500 group">
              <LogOut className="w-4 h-4 mr-4 group-hover:text-red-500 transition-colors" strokeWidth={1.5} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="pl-72">
        <div className="max-w-5xl mx-auto px-10 py-10">
          {children}
        </div>
      </main>
    </div>
  )
}
