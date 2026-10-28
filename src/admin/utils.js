export function emptyToNull(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value === '' ? null : value]))
}
