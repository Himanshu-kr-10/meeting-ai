'use client'

import { authClient } from '@/lib/auth-client'
import { Button } from '@/components/ui/button'

export const HomeView = () => {
  const { data: session } = authClient.useSession()

  if (!session) {
    return <div>Loading...</div>
  }

  const handleSignOut = () => {
    authClient.signOut()
  }

  return (
    <div>
      <h1>Hello {session.user.name}</h1>
      <Button onClick={handleSignOut}>Sign Out</Button>
    </div>
  )
}
