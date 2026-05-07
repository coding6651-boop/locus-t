import { getConfig } from './state.js'

export function startLifecycle(): void {
  const config = getConfig()
  // Future: init storage dirs, check model, etc.
}

export function stopLifecycle(): void {
  // Future: save session, flush logs, etc.
}
