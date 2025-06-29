import React from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'
import { ChevronUpIcon, CreditCardIcon, LogOutIcon } from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { GeneratedAvatar } from '@/components/generated-avatar'

export const DashboardUserButton = () => {
  const router = useRouter()
  const { data, isPending } = authClient.useSession()

  if (isPending || !data?.user) {
    return null
  }

  const onLogOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/sign-in')
        }
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center justify-between rounded-lg border border-border/10 
      p-3 w-full bg-white/5 hover:bg-white/10 overflow-hidden">
        {data.user.image ? (
          <Avatar>
            <AvatarImage src={data.user.image} />
          </Avatar>
        ) : (
          <GeneratedAvatar seed={data.user.name} variant='initials' className='size-9 mr-3' />
        )}

        <div className='flex flex-col gap-0.5 text-left overflow-hidden flex-1 min-w-0'>
          <p className='text-sm truncate w-full'>
            {data.user.name}
          </p>
          <p className='text-xs text-muted-foreground truncate w-full'>
            {data.user.email}
          </p>
        </div>
        <ChevronUpIcon className='size-4 shrink-0' />
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-[238px] bg-white/5 border border-border/10 text-white' side="top">
        <DropdownMenuLabel>
          <div className='flex flex-col gap-1'>
            <span className='font-medium truncate'>{data.user.name}</span>
            <span className='text-sm font-normal text-muted-foreground truncate'>{data.user.email}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className='bg-border/10' />
        <DropdownMenuItem className='cursor-pointer flex items-center justify-between '>
          Billing
          <CreditCardIcon className='size-4 text-muted-foreground'/>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onLogOut} className='cursor-pointer flex items-center justify-between'>
          Logout
          <LogOutIcon
            className='size-4 text-muted-foreground'
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
