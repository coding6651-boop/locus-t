export type Mode = 'offline' | 'online'

let currentMode: Mode = 'offline'

export function getMode(): Mode {
  return currentMode
}

export function setMode(mode: Mode): void {
  currentMode = mode
}
