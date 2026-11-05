import mongoose from 'mongoose'

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Enter a valid email address.'],
  },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, required: true, enum: ['admin', 'superadmin'], default: 'admin' },
  isActive: { type: Boolean, default: true },
  lastLoginAt: { type: Date, default: null },
}, { timestamps: true })

adminSchema.index({ email: 1 }, { unique: true, name: 'admin_email_unique' })
adminSchema.index({ isActive: 1, role: 1 }, { name: 'admin_active_role' })

const Admin = mongoose.models.Admin || mongoose.model('Admin', adminSchema)
export default Admin
