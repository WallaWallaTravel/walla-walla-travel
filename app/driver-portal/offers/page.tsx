import { getOffersForDriver } from '@/lib/actions/driverOffers'
import OffersClient from './OffersClient'

export default async function OffersPage() {
  const result = await getOffersForDriver()
  const offers = result.success ? result.offers! : []
  return <OffersClient initialOffers={offers} />
}
