import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { Plus } from 'lucide-react'
import { Layout } from '../components/Layout'
import { TokenTable, type License } from '../components/TokenTable'
import { CreateTokenModal } from '../components/CreateTokenModal'
import { api } from '../convex/_generated/api'

type StatusFilter = 'all' | 'unused' | 'activated' | 'expired' | 'revoked'

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unused', label: 'Unused' },
  { key: 'activated', label: 'Active' },
  { key: 'expired', label: 'Expired' },
  { key: 'revoked', label: 'Revoked' },
]

export function Tokens() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const licenses = useQuery(api.licenses.getAllLicenses)
  const createTokenMutation = useMutation(api.licenses.createLicenseToken)

  const filteredLicenses = useMemo(() => {
    if (!licenses) return undefined
    if (statusFilter === 'all') return licenses
    return licenses.filter((license: License) => license.status === statusFilter)
  }, [licenses, statusFilter])

  const handleCreateToken = async (data: {
    fullName: string
    expiresAt: number
    maxUses: number
  }): Promise<string | null> => {
    try {
      const result = await createTokenMutation({
        expiresAt: data.expiresAt,
        fullName: data.fullName,
        maxUses: data.maxUses,
      })
      if (!result.success) throw new Error(result.error || 'Failed to create token')
      return result.token || null
    } catch (error) {
      console.error('Failed to create token:', error)
      alert('Failed to create token: ' + (error instanceof Error ? error.message : 'Unknown error'))
      return null
    }
  }

  return (
    <Layout>
      <div className="mb-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-black tracking-tight">Tokens</h1>
            <p className="text-gray-400 text-sm mt-1.5">Manage activation tokens for your users</p>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2 text-sm py-2.5 px-5">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            <span>New Token</span>
          </button>
        </div>

        <div className="segmented-control">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={`segmented-option ${statusFilter === f.key ? 'segmented-option-active' : ''}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="ios-group">
        <TokenTable licenses={filteredLicenses} loading={licenses === undefined} filterStatus={statusFilter} />
      </div>

      <CreateTokenModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreate={handleCreateToken} />
    </Layout>
  )
}
