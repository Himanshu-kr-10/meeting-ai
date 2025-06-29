"use client"

import { ErrorState } from "@/components/error-state"

const ErrorPage = () => {
  return (
    <ErrorState 
      title="Error Loading Agents" 
      description="Please try again later" 
    />
  )
}

export default ErrorPage