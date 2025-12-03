export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'N/A'
  const date = new Date(dateStr)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return 'N/A'
  return num.toLocaleString()
}
