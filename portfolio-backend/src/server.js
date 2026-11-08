import 'dotenv/config'
import { createServer } from 'node:http'
import mongoose from 'mongoose'
import { createApp, connectDatabase } from './app.js'
import { loadConfig } from './config/env.js'

const config = loadConfig()
let server
let app

async function start() {
  await connectDatabase(config)
  app = createApp({ config })
  server = createServer(app)
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(config.port, resolve)
  })
  console.info(`Portfolio API listening on port ${config.port}.`)
}

let shuttingDown = false
async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.info(`Received ${signal}; shutting down.`)

  try {
    if (server?.listening) {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
    }
    await app?.locals.sessionStore?.close()
    await mongoose.disconnect()
    process.exitCode = 0
  } catch {
    process.exitCode = 1
  }
}

process.on('SIGINT', () => void shutdown('SIGINT'))
process.on('SIGTERM', () => void shutdown('SIGTERM'))

start().catch(async () => {
  console.error('Portfolio API failed to start. Check the environment and database configuration.')
  await mongoose.disconnect()
  process.exitCode = 1
})
