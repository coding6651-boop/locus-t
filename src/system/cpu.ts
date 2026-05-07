import { cpus } from 'os'

export function getCPUModel(): string {
  return cpus()[0]?.model ?? 'unknown'
}

export function getCPUCount(): number {
  return cpus().length
}

export function getCPUDetail(): string {
  return `${getCPUModel()} (${getCPUCount()} cores)`
}
