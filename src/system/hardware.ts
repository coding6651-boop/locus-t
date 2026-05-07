import { totalmem, freemem } from 'os'

export function getTotalRAM(): number {
  return Math.round(totalmem() / (1024 ** 3))
}

export function getFreeRAM(): number {
  return Math.round(freemem() / (1024 ** 3))
}

export function getUsedRAM(): number {
  return getTotalRAM() - getFreeRAM()
}

export function getRAMDetail(): string {
  return `${getTotalRAM()} GB total / ${getFreeRAM()} GB free`
}
