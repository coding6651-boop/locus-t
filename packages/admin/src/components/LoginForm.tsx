import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const { login, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const result = await login(email, password)
    if (!result.success) {
      setError(result.error || 'Invalid email or password')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-[0_4px_12px_0_rgb(0_0_0/0.1)]">
            <span className="text-white text-2xl font-bold tracking-tight">L</span>
          </div>
          <h1 className="text-2xl font-bold text-black tracking-tight mb-1">Welcome back</h1>
          <p className="text-gray-400 text-sm">Sign in to manage license tokens</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 px-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-500 px-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 rounded-2xl px-4 py-3">
              <p className="text-red-600 text-xs text-center font-medium">{error}</p>
            </div>
          )}

          <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                <span>Signing in...</span>
              </span>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-xs text-gray-300">
          Default: admin@locus.dev / admin123
        </p>
      </div>
    </div>
  )
}
