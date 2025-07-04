import { z } from 'zod'
import { db } from '@/db'
import { eq, getTableColumns } from 'drizzle-orm'
import { agents } from '@/db/schema'
import { createTRPCRouter, protectedProcedure } from '@/trpc/init'
import { createAgentSchema } from '../schema'

export const agentsRouter = createTRPCRouter({

  getOne: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input }) => {
    const [existingAgent] = await db
      .select({
        ...getTableColumns(agents)
      })
      .from(agents)
      .where(eq(agents.id, input.id))

    return existingAgent
  }),

  getMany: protectedProcedure.query(async () => {
    const data = await db
      .select()
      .from(agents)

    return data
  }),
  create: protectedProcedure.input(createAgentSchema).mutation(async ({ input, ctx }) => {
    const [createdAgent] = await db
      .insert(agents)
      .values({
        ...input,
        userId: ctx.auth.user.id,
      })
      .returning()

    return createdAgent
  }),
})
