import { HttpError } from '../utils/httpErrors.js'
import { adminMessage } from '../utils/query.js'
import { escapeRegex, paginationOptions } from '../utils/pagination.js'

function withQuery(query, method, ...args) {
  return typeof query?.[method] === 'function' ? query[method](...args) : query
}

export function createContactService({ ContactMessageModel }) {
  async function submit(input) {
    const saved = await ContactMessageModel.create({
      name: input.name.trim(),
      email: input.email.trim().toLowerCase(),
      subject: input.subject.trim(),
      message: input.message.trim(),
      status: 'new',
      emailStatus: 'pending',
    })
    return { id: String(saved._id ?? saved.id), saved: true }
  }

  async function list(query) {
    const { page, limit, skip } = paginationOptions(query)
    const filter = {}
    const requestedStatus = query.status === 'unread' ? 'new' : query.status
    if (requestedStatus !== 'all') filter.status = requestedStatus
    if (query.search) {
      const pattern = new RegExp(escapeRegex(query.search), 'i')
      filter.$or = [{ name: pattern }, { email: pattern }, { subject: pattern }, { message: pattern }]
    }
    const [total, records] = await Promise.all([
      ContactMessageModel.countDocuments(filter),
      withQuery(withQuery(withQuery(withQuery(withQuery(ContactMessageModel.find(filter), 'sort', { createdAt: query.sort === 'oldest' ? 1 : -1, _id: query.sort === 'oldest' ? 1 : -1 }), 'skip', skip), 'limit', limit), 'select', 'name email subject message status emailStatus readAt createdAt updatedAt'), 'lean'),
    ])
    return { items: records.map(adminMessage), page, limit, total }
  }

  async function get(id) {
    const message = await ContactMessageModel.findById(id)
    if (!message) throw new HttpError(404, 'MESSAGE_NOT_FOUND', 'Contact request not found.')
    return adminMessage(message)
  }

  async function setStatus(id, status, now = Date.now) {
    const message = await ContactMessageModel.findById(id)
    if (!message) throw new HttpError(404, 'MESSAGE_NOT_FOUND', 'Contact request not found.')
    const normalized = status === 'unread' ? 'new' : status
    const changes = { status: normalized }
    if (normalized === 'read' && !message.readAt) changes.readAt = new Date(now())
    if (normalized === 'new') changes.readAt = null
    const updated = await ContactMessageModel.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true })
    return adminMessage(updated)
  }

  async function remove(id) {
    const deleted = await ContactMessageModel.findByIdAndDelete(id)
    if (!deleted) throw new HttpError(404, 'MESSAGE_NOT_FOUND', 'Contact request not found.')
    return { id: String(deleted._id ?? deleted.id), deleted: true }
  }

  return { submit, list, get, setStatus, remove }
}
