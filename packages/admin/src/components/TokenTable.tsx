import { format } from 'date-fns'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'

export interface License {
  _id: string
  token: string
  fullName?: string
  userId: string
  status: 'unused' | 'activated' | 'expired' | 'revoked'
  deviceId?: string | null
  maxUses?: number
  usedCount?: number
  expiresAt: number
  activatedAt?: number | null
  createdAt: number
}

interface TokenTableProps {
  licenses: License[] | undefined
  loading?: boolean
  filterStatus?: 'all' | 'unused' | 'activated' | 'expired' | 'revoked'
}

function StatusDot({ status }: { status: License['status'] }) {
  const colors: Record<License['status'], string> = {
    unused: 'bg-gray-300',
    activated: 'bg-black',
    expired: 'bg-gray-200',
    revoked: 'bg-gray-400',
  }
  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${colors[status]} mr-2.5`} />
}

const STATUS_LABELS: Record<License['status'], string> = {
  unused: 'Unused',
  activated: 'Active',
  expired: 'Expired',
  revoked: 'Revoked',
}

function TokenSkeleton() {
  return (
    <div className="divide-y divide-gray-100/80">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="ios-row">
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 bg-gray-100 rounded-full animate-pulse" />
            <div className="h-2.5 w-48 bg-gray-50 rounded-full animate-pulse" />
          </div>
          <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ filterStatus }: { filterStatus: string }) {
  return (
    <div className="py-20 text-center">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Copy className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
      </div>
      <p className="text-sm text-gray-400 font-medium">
        {filterStatus !== 'all'
          ? `No tokens with status "${filterStatus}"`
          : 'No tokens yet'}
      </p>
      <p className="text-xs text-gray-300 mt-1">
        {filterStatus === 'all' ? 'Create your first token to get started.' : 'Try a different filter.'}
      </p>
    </div>
  )
}

export function TokenTable({ licenses, loading, filterStatus = 'all' }: TokenTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading || !licenses) return <TokenSkeleton />
  if (licenses.length === 0) return <EmptyState filterStatus={filterStatus} />

  return (
    <div>
      {licenses.map((license) => (
        <div key={license._id} className="ios-row group">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <code className="font-mono text-sm font-medium text-gray-900 tracking-wide">{license.token}</code>
              <button
                onClick={() => copyToClipboard(license.token, license._id)}
                className={clsx(
                  'p-1 rounded-lg transition-all duration-200',
                  copiedId === license._id
                    ? 'bg-black/5 text-black'
                    : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 hover:bg-gray-100'
                )}
              >
                {copiedId === license._id ? (
                  <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                ) : (
                  <Copy className="w-3.5 h-3.5" strokeWidth={1.5} />
                )}
              </button>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {license.fullName && <span>{license.fullName}</span>}
              {license.fullName && license.userId && <span className="text-gray-200">·</span>}
              <span className="font-mono">{license.userId}</span>
              <span className="text-gray-200">·</span>
              <span>{format(license.expiresAt, 'MMM d, yyyy')}</span>
              {license.deviceId && (
                <>
                  <span className="text-gray-200">·</span>
                  <span className="font-mono text-gray-300">{license.deviceId.slice(0, 12)}…</span>
                </>
              )}
              <span className="text-gray-200">·</span>
              <span>{license.usedCount ?? 0}/{license.maxUses ?? 1} uses</span>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <span className={clsx(
              'badge',
              license.status === 'unused' && 'badge-unused',
              license.status === 'activated' && 'badge-activated',
              license.status === 'expired' && 'badge-expired',
              license.status === 'revoked' && 'badge-revoked',
            )}>
              <StatusDot status={license.status} />
              {STATUS_LABELS[license.status]}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
