export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

export function todayToggle(
  items: { scheduled_date?: string | null }[],
  today: string
): { date: string | null; success: string } {
  const add = items.some((item) => item.scheduled_date !== today)
  return add
    ? { date: today, success: 'No plano de hoje' }
    : { date: null, success: 'Fora do plano de hoje' }
}
