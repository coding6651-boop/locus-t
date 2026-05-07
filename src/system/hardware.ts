import { totalmem, freemem, cpus } from 'os'

export function getTotalRAM(): number {
  return Math.round(totalmem() / (1024 ** 3))
}

export function getFreeRAM(): number {
  return Math.round(freemem() / (1024 ** 3))
}

export function getCPUModel(): string {
  return cpus()[0]?.model ?? 'unknown'
}
