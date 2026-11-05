import mongoose from 'mongoose'

const contactMessageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
  },
  subject: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, trim: true, maxlength: 10000 },
  status: { type: String, enum: ['new', 'read', 'replied', 'archived', 'spam'], default: 'new', required: true },
  emailStatus: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending', required: true },
  readAt: { type: Date, default: null },
}, { timestamps: true })

contactMessageSchema.index({ status: 1, createdAt: -1 }, { name: 'contact_status_created' })
contactMessageSchema.index({ emailStatus: 1, createdAt: -1 }, { name: 'contact_email_status_created' })
contactMessageSchema.index({ email: 1, createdAt: -1 }, { name: 'contact_sender_created' })

const ContactMessage = mongoose.models.ContactMessage || mongoose.model('ContactMessage', contactMessageSchema)
export default ContactMessage
