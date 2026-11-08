import { HttpError } from './httpErrors.js'

export async function lockTechnologyReferences(ids, TechnologyModel, session) {
  if (!session || !ids.length) return
  for (const id of ids) {
    const technology = await TechnologyModel.findOneAndUpdate(
      { _id: id },
      { $inc: { __v: 1 } },
      { returnDocument: 'after', session },
    )
    if (!technology) throw new HttpError(400, 'INVALID_TECHNOLOGY', 'One or more technology identifiers do not exist.')
  }
}
