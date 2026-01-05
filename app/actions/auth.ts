'use server'

import { login } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'

export async function loginAction(email: string, password: string) {
  logger.debug('Login attempt', { email })

  try {
    logger.debug('Calling login function')
    const result = await login(email, password)
    logger.debug('Login result', { result })

    if (!result.success) {
      logger.debug('Login failed', { error: result.error })
      return { error: result.error }
    }

    logger.debug('Login successful, redirecting')
    // Redirect to workflow on success
    redirect('/workflow')
  } catch (error) {
    logger.error('Login action error', {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    return { error: 'An error occurred during login' }
  }
}
