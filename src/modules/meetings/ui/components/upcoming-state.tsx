import Link from "next/link";
import { VideoIcon, BanIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";

interface Props {
  meetingId: string;
  onCancelMeeting: () => void;
  isCancelling: boolean;
}

export const UpcomingState = ({
  meetingId,
  onCancelMeeting,
  isCancelling
}: Props) => {
  return (
    <div className="bg-white rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center">
      <EmptyState
        title="Not started yet"
        description="Once you start this meeting, a summary will appear here"
        image="/upcoming.svg"
      />
      <div className="flex flex-col-reverse lg:flex-row lg:justify-center items-center gap-2 w-full">
        <Button className="w-full lg:w-auto" variant="secondary" onClick={onCancelMeeting} disabled={isCancelling}>
          <BanIcon className="w-4 h-4" />
          Cancel Meeting
        </Button>
        <Button asChild className="w-full lg:w-auto" disabled={isCancelling}>
          <Link href={`/call/${meetingId}`}>
            <VideoIcon className="" />
            Start Meeting
          </Link>
        </Button>
      </div>
    </div>
  )
} 