"use client"
import { ErrorState } from "@/components/error-state";
import { LoadingState } from "@/components/loading-state";
import { useTRPC } from "@/trpc/client"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { MeetingIdViewHeader } from "../components/meeting-id-view-header";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { UpdateMeetingDialog } from "../components/update-meeting-dialog";
import { useState } from "react";
import { UpcomingState } from "../components/upcoming-state";
import { ActiveState } from "../components/active-state";
import { CancelledState } from "../components/cancelled-state";
import { ProcessingState } from "../components/processing-state";


interface Props {
  meetingId: string
}

export const MeetingIdView = async ({ meetingId }: Props) => {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [RemoveConfirmation, confirmRemove] = useConfirm(
    "Are you sure?",
    "The following action will remove this meeting"
  )
  const [updateMeetingDialogOpen, setUpdateMeetingDialogOpen] = useState(false);
  const { data } = useSuspenseQuery(
    trpc.meetings.getOne.queryOptions({
      id: meetingId
    })
  )

  const removeMeeting = useMutation(
    trpc.meetings.remove.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}))
        router.push("/meetings")
      }
    })
  )

  const handleRemove = async () => {
    const ok = await confirmRemove();

    if(!ok) return;

    await removeMeeting.mutateAsync({
      id: meetingId
    })
  }

  const isActive = data.status === "active";
  const isUpcoming = data.status === "upcoming";
  const isCancelled = data.status === "cancelled";
  const isCompleted = data.status === "completed";
  const isProcessing = data.status === "processing";

  return (
    <>
      <UpdateMeetingDialog 
        open={updateMeetingDialogOpen}
        onOpenChange={setUpdateMeetingDialogOpen}
        initialValues={data}
      />
      <RemoveConfirmation />
      <div className="flex-1 py-4 px-4 md:py-8 flex flex-col gap-y-4">
        <MeetingIdViewHeader 
          meetingId={meetingId}
          meetingName={data.name}
          onEdit={() => setUpdateMeetingDialogOpen(true)}
          onRemove={handleRemove}
        /> 
        {isCancelled && <CancelledState />}
        {isCompleted && <CancelledState />}
        {isProcessing && <ProcessingState />}
        {isActive && (
          <ActiveState
            meetingId={meetingId}
          />
        )}
        {isUpcoming && (
          <UpcomingState 
            meetingId={meetingId}
            onCancelMeeting={() => {}}
            isCancelling={false}
          />
        )}
      </div>
    </>
  )
}

export const MeetingIdViewLoading = () => {
  return (
    <LoadingState 
      title="Loading Meeting"
      description="This may take a few seconds"
    />
  )
}

export const MeetingIdViewError = () => {
  return (
    <ErrorState 
      title="Error Loading Meeting"
      description="Please try again later"
    />
  )
}