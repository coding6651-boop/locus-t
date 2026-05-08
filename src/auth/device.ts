import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { hostname, arch, platform } from 'node:os'

export type DeviceInfo = {
  id: string
  warnings: string[]
}

let cached: DeviceInfo | null = null

export function getDeviceId(): DeviceInfo {
  if (cached) return cached

  const parts: string[] = []
  const warnings: string[] = []
  const plat = platform()
  const TIMEOUT = 10000

  if (plat === 'win32') {
    try {
      const guid = execSync(
        'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
        { encoding: 'utf-8', timeout: TIMEOUT }
      )
      const m = guid.match(/MachineGuid\s+REG_SZ\s+(.+)/)
      if (m) parts.push(m[1].trim())
    } catch {}

    try {
      const cpu = execSync(
        'powershell -NoProfile -Command "& {Get-CimInstance Win32_Processor | Select-Object -ExpandProperty ProcessorId}"',
        { encoding: 'utf-8', timeout: TIMEOUT }
      )
      const val = cpu.trim()
      if (val) parts.push(val)
    } catch {}

    try {
      const board = execSync(
        'powershell -NoProfile -Command "& {Get-CimInstance Win32_BaseBoard | Select-Object -ExpandProperty SerialNumber}"',
        { encoding: 'utf-8', timeout: TIMEOUT }
      )
      const val = board.trim()
      if (val) parts.push(val)
    } catch {}
  } else if (plat === 'linux') {
    const paths = ['/etc/machine-id', '/sys/class/dmi/id/product_uuid', '/sys/class/dmi/id/board_serial']
    for (const p of paths) {
      try {
        if (existsSync(p)) parts.push(readFileSync(p, 'utf-8').trim())
      } catch {}
    }
  } else if (plat === 'darwin') {
    try {
      const ioreg = execSync('ioreg -rd1 -c IOPlatformExpertDevice', { encoding: 'utf-8', timeout: TIMEOUT })
      const m = ioreg.match(/"IOPlatformUUID" = "(.+?)"/)
      if (m) parts.push(m[1])
    } catch {}

    try {
      const model = execSync('sysctl -n hw.model', { encoding: 'utf-8', timeout: TIMEOUT })
      parts.push(model.trim())
    } catch {}
  }

  if (parts.length < 2) {
    warnings.push('Limited device identifiers available. License binding may be less reliable.')
    parts.push(hostname(), arch())
  }

  const sorted = parts.map(p => p.toLowerCase()).sort()
  const hash = createHash('sha256').update(sorted.join('|')).digest('hex')
  const raw = hash.slice(0, 12)
  const id = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`.toUpperCase()

  cached = { id, warnings }
  return cached
}
