"use client"
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusIcon } from 'lucide-react'
import { NewAgentDialog } from './new-agent-dialog'

const AgentListHeader = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <NewAgentDialog open={open} onOpenChange={setOpen} />
      <div className="p-4 md:px-8 flex flex-col gap-y-4">
        <div className='flex items-center justify-between'>
          <h5 className='text-xl font-medium'>My Agents</h5>
          <Button onClick={() => setOpen(true)}>
            <PlusIcon />
            New Agent
          </Button>
        </div>
      </div>
    </>
  )
}

export default AgentListHeader