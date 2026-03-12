import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { getInvoicesList, getPendingInvoices } from '@/lib/actions/invoice-queries'
import InvoiceManager from '@/components/admin/InvoiceManager'

export default async function AdminInvoicesPage() {
  const session = await getSession()
  if (!session?.user || session.user.role !== 'admin') redirect('/login')

  const [invoices, pendingInvoices] = await Promise.all([
    getInvoicesList(),
    getPendingInvoices(),
  ])

  return (
    <div className="min-h-screen bg-slate-50">
      <InvoiceManager
        initialInvoices={invoices}
        pendingInvoices={pendingInvoices}
      />
    </div>
  )
}
