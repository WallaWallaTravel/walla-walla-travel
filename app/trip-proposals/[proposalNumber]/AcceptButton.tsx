'use client'

import { useActionState } from 'react'
import { acceptProposal, type AcceptState } from '@/lib/actions/proposal-accept'

interface AcceptButtonProps {
  proposalNumber: string
}

export default function AcceptButton({ proposalNumber }: AcceptButtonProps) {
  const boundAction = acceptProposal.bind(null, proposalNumber)
  const [state, action, pending] = useActionState<AcceptState, FormData>(boundAction, null)

  if (state?.success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 text-center">
        <div className="text-4xl mb-3">&#10003;</div>
        <p className="text-emerald-800 font-bold text-xl mb-1">Proposal Accepted!</p>
        <p className="text-emerald-700">
          We&apos;ll be in touch shortly to finalize your trip details.
        </p>
      </div>
    )
  }

  return (
    <form action={action}>
      {state?.error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#722F37] text-white px-8 py-4 font-bold text-lg
          hover:bg-[#5a252c] active:bg-[#4a1f24] transition-colors shadow-lg
          disabled:opacity-60 disabled:cursor-not-allowed min-h-[56px]"
      >
        {pending ? (
          <span className="flex items-center justify-center gap-3">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Processing...
          </span>
        ) : (
          'Accept This Proposal'
        )}
      </button>
    </form>
  )
}
