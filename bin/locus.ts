#!/usr/bin/env node
import dotenv from 'dotenv'
import { existsSync } from 'node:fs'

if (existsSync('.env.local')) dotenv.config({ path: '.env.local' })

import { bootstrap } from '../src/runtime/bootstrap.js'

bootstrap().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
