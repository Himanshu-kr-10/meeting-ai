import { z } from "zod";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";

import { AgentGetOne } from "../../types";
import { createAgentSchema } from "../../schema";

import { Button } from "@/components/ui/button";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { GeneratedAvatar } from "@/components/generated-avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";


interface AgentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  initialValues?: AgentGetOne
}

export const AgentForm = ({
  onSuccess,
  onCancel,
  initialValues,
}: AgentFormProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const createAgent = useMutation(
    trpc.agents.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries(
          trpc.agents.getMany.queryOptions({})
        )

        if(initialValues?.id) {
          queryClient.invalidateQueries(
            trpc.agents.getOne.queryOptions({ id: initialValues.id })
          )
        } 

        onSuccess?.();
      },
      onError: (error) => {
        toast.error(error.message)
      }
    })
  );

  const form = useForm<z.infer<typeof createAgentSchema>>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      name: initialValues?.name ?? "",
      instructions: initialValues?.instructions ?? ""
    }
  })

  const isEdit = !!initialValues;
  const isPending = createAgent.isPending;

  const onSubmit = (data: z.infer<typeof createAgentSchema>) => {
    if(isEdit) {
      console.log("TODO: Update agent")
    } else {
      createAgent.mutate(data)
    }
  }


  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <GeneratedAvatar 
          seed={form.watch("name")}
          variant="botttsNeutral"
          className="border size-16"
        />

        <FormField 
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="e.g. English Tutor" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField 
          control={form.control}
          name="instructions"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Instructions</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  placeholder="You are a helpful english assistant that can answer questions and help with tasks." 
                  rows={20}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex items-center justify-between gap-x-2 ">
          {onCancel && (
            <Button 
              variant="ghost" 
              disabled={isPending} 
              type="button" 
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isPending}>
            {isEdit ? "Update" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  )

}