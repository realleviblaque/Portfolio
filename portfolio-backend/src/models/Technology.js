import mongoose from 'mongoose'
import { normalizeTechnologyName } from '../utils/technologyName.js'

const technologySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  normalizedName: { type: String, required: true, select: false },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 120,
    match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug may contain lowercase letters, numbers, and hyphens.'],
  },
  category: { type: String, trim: true, lowercase: true, maxlength: 80, default: 'other' },
  icon: { type: String, trim: true, maxlength: 2048, default: '' },
}, { timestamps: true })

technologySchema.index({ slug: 1 }, { unique: true, name: 'technology_slug_unique' })
technologySchema.index({ normalizedName: 1 }, { unique: true, name: 'technology_normalized_name_unique' })
technologySchema.index({ category: 1, name: 1 }, { name: 'technology_category_name' })

technologySchema.pre('validate', function normalizeName() {
  if (this.isModified('name') || !this.normalizedName) this.normalizedName = normalizeTechnologyName(this.name)
})

const Technology = mongoose.models.Technology || mongoose.model('Technology', technologySchema)
export default Technology
