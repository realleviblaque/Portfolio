import 'dotenv/config'
import { createInterface } from 'node:readline/promises'
import { StringDecoder } from 'node:string_decoder'
import { stdin, stdout } from 'node:process'
import mongoose from 'mongoose'
import argon2 from 'argon2'
import Admin from '../models/Admin.js'

function readHidden(prompt) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('Run this command in an interactive terminal so the password can be entered without echo.')
  }

  return new Promise((resolve, reject) => {
    let value = ''
    const decoder = new StringDecoder('utf8')
    stdout.write(prompt)
    stdin.setRawMode(true)
    stdin.resume()

    const finish = (error) => {
      stdin.off('data', onData)
      stdin.setRawMode(false)
      stdout.write('\n')
      if (error) reject(error)
      else resolve(value)
    }

    const onData = (input) => {
      for (const char of decoder.write(input)) {
        if (char === '\u0003') return finish(new Error('Administrator creation cancelled.'))
        if (char === '\r' || char === '\n') return finish()
        if (char === '\u007f' || char === '\b') value = value.slice(0, -1)
        else value += char
      }
    }

    stdin.on('data', onData)
  })
}

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in the backend .env file first.')
  await mongoose.connect(process.env.MONGODB_URI)

  const existingCount = await Admin.countDocuments()
  if (existingCount > 0) {
    throw new Error('An administrator already exists. This one-time bootstrap command will not create another.')
  }

  const readline = createInterface({ input: stdin, output: stdout })
  const name = (await readline.question('Administrator name: ')).trim()
  const email = (await readline.question('Administrator email: ')).trim().toLowerCase()
  readline.close()

  const password = await readHidden('Password (minimum 12 characters): ')
  const confirmation = await readHidden('Confirm password: ')
  if (password.length < 12) throw new Error('Password must contain at least 12 characters.')
  if (password !== confirmation) throw new Error('The passwords did not match.')

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id })
  await Admin.create({ name, email, passwordHash, role: 'superadmin', isActive: true })
  console.info(`Initial administrator created for ${email}. The password was not displayed or saved in plaintext.`)
}

main()
  .catch((error) => {
    console.error(error.message || 'Administrator bootstrap failed.')
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
  })
