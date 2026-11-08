export function normalizeTechnologyName(name) {
  return String(name).normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}
