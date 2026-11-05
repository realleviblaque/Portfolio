import mongoose from 'mongoose'

const technologySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
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
technologySchema.index({ category: 1, name: 1 }, { name: 'technology_category_name' })

const Technology = mongoose.models.Technology || mongoose.model('Technology', technologySchema)
export default Technology
