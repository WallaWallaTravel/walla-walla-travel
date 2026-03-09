'use client'

// TODO: Rebuild with useActionState (fresh build)

import Link from 'next/link'

export default function CreateProposalPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link
          href="/admin/trip-proposals"
          className="inline-flex items-center text-indigo-600 hover:text-indigo-800 font-medium mb-4"
        >
          &larr; Back to Trip Proposals
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Create Trip Proposal</h1>
        <p className="text-gray-700 mt-1">
          This form will be rebuilt with useActionState.
        </p>
      </div>
    </div>
  )
}
