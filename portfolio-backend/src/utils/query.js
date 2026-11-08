export function queryArray(query, method, ...args) {
  if (typeof query?.[method] === 'function') return query[method](...args)
  return query
}

export async function toPlain(value) {
  const result = await value
  if (Array.isArray(result)) return result.map((item) => item?.toObject ? item.toObject() : item)
  return result?.toObject ? result.toObject() : result
}

export function publicTechnology(technology) {
  if (!technology) return null
  return {
    id: String(technology._id ?? technology.id),
    name: technology.name,
    slug: technology.slug,
    category: technology.category,
    icon: technology.icon,
  }
}

export function publicImage(image, { crop = false } = {}) {
  if (!image) return null
  const safe = {
    url: image.url,
    altText: image.altText,
    caption: image.caption,
    width: image.width,
    height: image.height,
    format: image.format,
  }
  if (crop) {
    safe.positionX = image.positionX
    safe.positionY = image.positionY
    safe.zoom = image.zoom
  }
  return safe
}

export function publicProject(project) {
  return {
    id: String(project._id ?? project.id),
    title: project.title,
    slug: project.slug,
    shortDescription: project.shortDescription,
    description: project.description,
    category: project.category,
    status: project.status,
    publicationStatus: project.publicationStatus,
    coverImage: publicImage(project.coverImage),
    coverAlt: project.coverImage?.altText || '',
    coverCaption: project.coverImage?.caption || '',
    gallery: (project.gallery || []).map((image) => publicImage(image)),
    technologies: (project.technologies || []).map(publicTechnology).filter(Boolean),
    liveUrl: project.liveUrl,
    repositoryUrl: project.repositoryUrl,
    startDate: project.startedAt,
    endDate: project.completedAt,
    timeline: project.timeline || [],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  }
}

export function adminProject(project) {
  const plain = project?.toObject ? project.toObject() : project
  const statusLabels = { ongoing: 'Ongoing', completed: 'Completed', paused: 'Paused' }
  const projectId = String(plain._id ?? plain.id)
  return {
    id: projectId,
    title: plain.title,
    slug: plain.slug,
    shortDescription: plain.shortDescription,
    description: plain.description,
    category: plain.category,
    status: statusLabels[plain.status] || plain.status,
    publicationStatus: plain.publicationStatus,
    coverImage: plain.coverImage,
    coverPreview: plain.coverImage?.url || '',
    gallery: (plain.gallery || []).map((image, index) => ({
      ...image,
      id: image.publicId || `${projectId}-gallery-${index + 1}`,
      preview: image.url,
      file: null,
    })),
    technologies: (plain.technologies || []).map((item) => typeof item === 'string' ? item : item?.name).filter(Boolean).join(', '),
    startDate: plain.startedAt ? new Date(plain.startedAt).toISOString().slice(0, 10) : '',
    endDate: plain.completedAt ? new Date(plain.completedAt).toISOString().slice(0, 10) : '',
    liveUrl: plain.liveUrl || '',
    repositoryUrl: plain.repositoryUrl || '',
    timeline: plain.timeline || [],
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  }
}

export function adminMessage(message) {
  const plain = message?.toObject ? message.toObject() : message
  return {
    id: String(plain._id ?? plain.id),
    name: plain.name,
    email: plain.email,
    subject: plain.subject,
    message: plain.message,
    status: plain.status === 'new' ? 'unread' : plain.status,
    emailStatus: plain.emailStatus,
    readAt: plain.readAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  }
}

export function adminTechnology(technology) {
  const item = technology?.toObject ? technology.toObject() : technology
  return { id: String(item._id ?? item.id), name: item.name, slug: item.slug, category: item.category, icon: item.icon, createdAt: item.createdAt, updatedAt: item.updatedAt }
}
