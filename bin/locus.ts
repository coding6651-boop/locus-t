#!/usr/bin/env node
import { bootstrap } from '../src/runtime/bootstrap.js'

bootstrap().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
