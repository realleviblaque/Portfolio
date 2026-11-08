export function paginationOptions(query) {
  return {
    page: query.page,
    limit: query.limit,
    skip: (query.page - 1) * query.limit,
  }
}

export function pageSort(sort) {
  if (sort === 'oldest') return { createdAt: 1, _id: 1 }
  if (sort === 'recentlyUpdated') return { updatedAt: -1, _id: -1 }
  return { createdAt: -1, _id: -1 }
}

export function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
