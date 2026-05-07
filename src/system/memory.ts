import { totalmem, freemem } from 'os'

export function getMemoryInfo() {
  return {
    total: totalmem(),
    free: freemem(),
    used: totalmem() - freemem(),
  }
}
