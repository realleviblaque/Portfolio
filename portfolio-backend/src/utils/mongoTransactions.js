import mongoose from 'mongoose'
import { HttpError } from './httpErrors.js'

function isUnsupportedTransaction(error) {
  return error?.code === 20
    || error?.codeName === 'IllegalOperation'
    || /transaction numbers are only allowed|does not support transactions|transactions are not supported/i.test(error?.message || '')
}

export async function runMongoTransaction(operation, connection = mongoose.connection) {
  const session = await connection.startSession()
  try {
    let result
    await session.withTransaction(async () => {
      result = await operation(session)
    })
    return result
  } catch (error) {
    if (isUnsupportedTransaction(error)) {
      throw new HttpError(503, 'MONGODB_TRANSACTIONS_REQUIRED',
        'This operation requires MongoDB transactions. Configure MongoDB as a replica set or sharded cluster.')
    }
    throw error
  } finally {
    await session.endSession()
  }
}
