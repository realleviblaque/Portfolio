import 'dotenv/config'
import mongoose from 'mongoose'
import { normalizeTechnologyName } from '../utils/technologyName.js'

const applyChanges = process.argv.includes('--apply')
const collectionName = 'technologies'

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI to the target database before running this migration.')
  await mongoose.connect(process.env.MONGODB_URI)
  const collection = mongoose.connection.collection(collectionName)
  const documents = await collection.find({}, { projection: { _id: 1, name: 1, normalizedName: 1 } }).toArray()
  const groups = new Map()
  for (const document of documents) {
    const normalizedName = normalizeTechnologyName(document.name)
    const group = groups.get(normalizedName) || []
    group.push({ id: String(document._id), name: document.name })
    groups.set(normalizedName, group)
  }

  const duplicates = [...groups.entries()].filter(([, records]) => records.length > 1)
  if (duplicates.length) {
    console.error('Migration stopped: duplicate normalized technology names need manual resolution:')
    for (const [normalizedName, records] of duplicates) console.error(JSON.stringify({ normalizedName, records }))
    process.exitCode = 2
    return
  }

  const updates = documents.filter((document) => document.normalizedName !== normalizeTechnologyName(document.name))
  if (!applyChanges) {
    console.info(`Dry run: ${documents.length} technology records checked; ${updates.length} normalizedName values need backfill.`)
    console.info('Run npm run technology:names:migrate -- --apply while technology writes are paused to backfill and create the unique index.')
    return
  }

  if (updates.length) {
    await collection.bulkWrite(updates.map((document) => ({
      updateOne: {
        filter: { _id: document._id },
        update: { $set: { normalizedName: normalizeTechnologyName(document.name) } },
      },
    })), { ordered: true })
  }
  await collection.createIndex({ normalizedName: 1 }, { unique: true, name: 'technology_normalized_name_unique' })
  console.info(`Migration complete: backfilled ${updates.length} records and ensured the unique normalized-name index.`)
}

main().catch((error) => {
  console.error(`Technology name migration failed: ${error.message}`)
  process.exitCode = 1
}).finally(async () => {
  await mongoose.disconnect()
})
