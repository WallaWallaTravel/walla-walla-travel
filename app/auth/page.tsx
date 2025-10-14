import { redirect } from 'next/navigation'

export default function AuthPage() {
  // Redirect to the main login page
  redirect('/login')
}
