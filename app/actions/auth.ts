'use server'

import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { logger } from '@/lib/logger'
import { AuthError } from 'next-auth'

export async function loginAction(email: string, password: string) {
  logger.debug('Login attempt', { email })

  try {
    await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    logger.debug('Login successful, redirecting')
    redirect('/workflow')
  } catch (error) {
    // Auth.js throws NEXT_REDIRECT for redirect(), re-throw it
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    if (error instanceof AuthError) {
      logger.debug('Login failed', { error: error.message })
      return { error: 'Invalid email or password' }
    }
    logger.error('Login action error', {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error)
    })
    return { error: 'An error occurred during login' }
  }
}
