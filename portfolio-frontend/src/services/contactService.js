export class ContactServiceUnavailableError extends Error {
  constructor() {
    super('The contact service is not connected. Your message has not been sent.')
    this.name = 'ContactServiceUnavailableError'
  }
}

// Replace this implementation when the owner provides the backend contract.
export async function submitContactRequest(contactRequest) {
  if (!contactRequest) throw new TypeError('Contact details are required.')
  throw new ContactServiceUnavailableError()
}
