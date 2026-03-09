'use client'

// TODO: Rebuild with useActionState (fresh build)

import { useRouter } from 'next/navigation'
import {
  TouchButton,
  MobileCard,
  BottomActionBar,
  BottomActionBarSpacer,
} from '@/components/mobile'

interface ClockInFormProps {
  driverName: string
}

export default function ClockInForm({ driverName }: ClockInFormProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 pb-32 overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 space-y-4 pb-32">
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-gray-900">Clock In</h1>
          <p className="text-gray-800 mt-2">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <MobileCard title="Driver" variant="elevated">
          <div className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-lg">
              {driverName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{driverName}</p>
              <p className="text-sm text-gray-600">Logged in</p>
            </div>
          </div>
        </MobileCard>

        <MobileCard variant="bordered">
          <p className="text-gray-700">Clock-in form will be rebuilt with useActionState.</p>
        </MobileCard>

        <BottomActionBarSpacer />
      </div>

      <BottomActionBar>
        <TouchButton
          variant="secondary"
          size="large"
          fullWidth
          onClick={() => router.back()}
        >
          Cancel
        </TouchButton>
      </BottomActionBar>
    </div>
  )
}
