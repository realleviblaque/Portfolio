function getDateValue(value) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function getProjectDate(project) {
  return project.createdAt || project.startDate
}

export function filterAndSortProjects(projects, { query, category, status, sort }) {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  const filteredProjects = projects.filter((project) => {
    const matchesQuery = !normalizedQuery || [project.title, project.name, project.description, project.shortDescription]
      .some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
    const matchesCategory = category === 'all' || project.category === category
    const matchesStatus = status === 'all' || project.status?.toLowerCase() === status
    return matchesQuery && matchesCategory && matchesStatus
  })

  return filteredProjects.sort((first, second) => {
    if (sort === 'oldest') return getDateValue(getProjectDate(first)) - getDateValue(getProjectDate(second))
    if (sort === 'updated') {
      return getDateValue(second.updatedAt || getProjectDate(second)) - getDateValue(first.updatedAt || getProjectDate(first))
    }
    return getDateValue(getProjectDate(second)) - getDateValue(getProjectDate(first))
  })
}
