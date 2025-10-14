'use server'

import { login } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function loginAction(email: string, password: string) {
  console.log('🔵 Login attempt:', email)
  
  try {
    console.log('🔵 Calling login function...')
    const result = await login(email, password)
    console.log('🔵 Login result:', result)
    
    if (!result.success) {
      console.log('🔴 Login failed:', result.error)
      return { error: result.error }
    }
    
    console.log('✅ Login successful, redirecting...')
    // Redirect to workflow on success
    redirect('/workflow')
  } catch (error) {
    console.error('🔴 Login action error:', error)
    console.error('🔴 Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('🔴 Error message:', error instanceof Error ? error.message : String(error))
    return { error: 'An error occurred during login' }
  }
}
