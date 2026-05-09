import { useState, useEffect } from 'react'
import { Copy, Check, X } from 'lucide-react'

interface CreateTokenModalProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (data: { fullName: string; expiresAt: number; maxUses: number }) => Promise<string | null>
}

export function CreateTokenModal({ isOpen, onClose, onCreate }: CreateTokenModalProps) {
  const [fullName, setFullName] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [expiryTime, setExpiryTime] = useState('')
  const [maxUses, setMaxUses] = useState(1)
  const [generatedToken, setGeneratedToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!expiryDate || !expiryTime) return
    setLoading(true)
    const date = new Date(`${expiryDate}T${expiryTime}`)
    const token = await onCreate({ fullName, expiresAt: date.getTime(), maxUses })
    if (token) setGeneratedToken(token)
    setLoading(false)
  }

  const copyToken = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    setVisible(false)
    setTimeout(() => {
      setFullName('')
      setExpiryDate('')
      setExpiryTime('')
      setMaxUses(1)
      setGeneratedToken(null)
      setCopied(false)
      onClose()
    }, 200)
  }

  if (!isOpen) return null

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      <div
        className={`fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-[0_-4px_24px_0_rgb(0_0_0/0.08)] transition-transform duration-300 ease-out border-t border-gray-100/50 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 bg-gray-200 rounded-full" />
        </div>

        <div className="px-6 pb-8 pt-2 max-w-sm mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-black tracking-tight">
              {generatedToken ? 'Token Created' : 'New Token'}
            </h3>
            <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all">
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          {generatedToken ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_4px_12px_0_rgb(0_0_0/0.1)]">
                <Check className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
              <p className="text-sm text-gray-500 mb-5">Share this token with the user</p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-5 border border-gray-100/50">
                <div className="flex items-center justify-between gap-3">
                  <code className="font-mono text-sm text-black font-medium tracking-wide truncate">{generatedToken}</code>
                  <button
                    onClick={copyToken}
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-200 rounded-xl transition-all flex-shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-black" strokeWidth={2.5} /> : <Copy className="w-4 h-4" strokeWidth={1.5} />}
                  </button>
                </div>
              </div>
              <button onClick={handleClose} className="btn-primary w-full text-sm py-3">
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 px-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 px-1">Expiry Date & Time</label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input-field" required />
                  <input type="time" value={expiryTime} onChange={(e) => setExpiryTime(e.target.value)} className="input-field" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-500 px-1">Max Uses</label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxUses}
                  onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                  className="input-field"
                  required
                />
              </div>

              <p className="text-xs text-gray-300 text-center pt-1">User ID will be auto-generated</p>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={handleClose} className="btn-secondary flex-1 text-sm py-3">
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1 text-sm py-3" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white"></div>
                      <span>Creating...</span>
                    </span>
                  ) : (
                    'Create Token'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
