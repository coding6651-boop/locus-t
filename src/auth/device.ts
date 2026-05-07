import { networkInterfaces } from 'os'

export class Device {
  getFingerprint(): string {
    const nets = networkInterfaces()
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.mac && net.mac !== '00:00:00:00:00:00') return net.mac
      }
    }
    return 'unknown'
  }
}
