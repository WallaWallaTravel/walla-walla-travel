import { getDriverSchedule } from '@/lib/actions/driver-queries'
import ScheduleClient from './ScheduleClient'

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>
}) {
  const params = await searchParams

  const now = new Date()
  const year = params.year ? parseInt(params.year, 10) : now.getUTCFullYear()
  const month = params.month ? parseInt(params.month, 10) : now.getUTCMonth() + 1

  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

  const result = await getDriverSchedule(undefined, { start, end })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bookings = result.success && result.data ? (result.data as any).bookings ?? [] : []

  return <ScheduleClient bookings={bookings} year={year} month={month} />
}
