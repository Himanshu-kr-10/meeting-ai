import { z } from 'zod'
import { db } from '@/db'
import { and, count, desc, eq, getTableColumns, ilike, sql } from 'drizzle-orm'
import { agents, meetings } from '@/db/schema'
import { createTRPCRouter, protectedProcedure } from '@/trpc/init'
import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MIN_PAGE_SIZE } from '@/constants'
import { TRPCError } from '@trpc/server'
import { createMeetingSchema, updateMeetingSchema } from '../schema'
import { MeetingStatus } from '../types'
import { streamVideo } from '@/lib/stream-video'
import { generateAvatarUri } from '@/lib/avatar'

export const meetingsRouter = createTRPCRouter({
  generateToken: protectedProcedure.mutation(async ({ ctx }) => {
    await streamVideo.upsertUsers([
      {
        id: ctx.auth.user.id,
        name: ctx.auth.user.name,
        role: "admin",
        image:
           ctx.auth.user.image ?? 
           generateAvatarUri({ seed: ctx.auth.user.name, variant: "initials" })
      }
    ])

    const expirationTime = Math.floor(Date.now() / 1000) + 60 * 60 
    const issuedAt = Math.floor(Date.now() / 1000) - 60 

    const token = streamVideo.generateUserToken({
      user_id: ctx.auth.user.id,
      exp: expirationTime,
      validity_in_seconds: issuedAt
    })

    return token
  }), 
  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
    const [removeMeeting] = await db
      .delete(meetings)
      .where(
        and(
          eq(meetings.id, input.id), 
          eq(meetings.userId, ctx.auth.user.id)
        )
      )
      .returning()

    if (!removeMeeting) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Meeting not found',
      })
    }

    return removeMeeting
  }),
  update: protectedProcedure
    .input(updateMeetingSchema)
    .mutation(async ({ ctx, input }) => {
    const [updateMeeting] = await db
      .update(meetings)
      .set(input)
      .where(
        and(
          eq(meetings.id, input.id), 
          eq(meetings.userId, ctx.auth.user.id)
        )
      )
      .returning()

    if (!updateMeeting) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Meeting not found',
      })
    }

    return updateMeeting
  }),
  create: protectedProcedure.input(createMeetingSchema).mutation(async ({ input, ctx }) => {
    const [createdMeetings] = await db
      .insert(meetings)
      .values({
        ...input,
        userId: ctx.auth.user.id,
      })
      .returning()

      // create call after creating meeting
      const call = streamVideo.video.call("default", createdMeetings.id);
      await call.create({
        data: {
          created_by_id: ctx.auth.user.id,
          custom: {
            meetingId: createdMeetings.id,
            meetingName: createdMeetings.name
          },
          settings_override: {
            recording: {
              mode: "auto-on",
              quality: "1080p"
            },
            transcription: {
              language: "en",
              mode: "auto-on",
              closed_caption_mode: "auto-on"
            }
          }
        }
      })

      // find a agent with whom you want to attach this meeting
      const [existingAgent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, createdMeetings.agentId))

      if(!existingAgent){
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Agent not found"
        })
      } 

      // now upsert agent as a user earlier we upsert our self as a admin
      await streamVideo.upsertUsers([
        {
          id: existingAgent.id,
          name: existingAgent.name,
          role: "user",
          image: generateAvatarUri({
            seed: existingAgent.name,
            variant: "botttsNeutral"
          })
        }
      ])

    return createdMeetings
  }),
  getOne: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const [existingMeeting] = await db
      .select({
        ...getTableColumns(meetings),
        agent: agents,
        duration: sql<number>`EXTRACT(EPOCH FROM(ended_at - started_at))`.as('duration'), 
      })
      .from(meetings) 
      .innerJoin(agents, eq(meetings.agentId, agents.id))
      .where(and(eq(meetings.id, input.id), eq(meetings.userId, ctx.auth.user.id)))

    if (!existingMeeting) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Meeting not found' })
    }

    return existingMeeting
  }),
  getMany: protectedProcedure
    .input(
      z.object({
        page: z.number().default(DEFAULT_PAGE),
        pageSize: z.number().min(MIN_PAGE_SIZE).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
        search: z.string().nullish(),
        agentId: z.string().nullish(),
        status: z
          .enum([
            MeetingStatus.Active,
            MeetingStatus.Cancelled,
            MeetingStatus.Completed,
            MeetingStatus.Processing,
            MeetingStatus.Upcoming
          ])
          .nullish()
      }),
    )
    .query(async ({ ctx, input }) => {
      const { search, page, pageSize, status, agentId } = input
      const data = await db
        .select({
          ...getTableColumns(meetings),
          agent: agents,
          duration: sql<number>`EXTRACT(EPOCH FROM(ended_at - started_at))`.as("duration")
        })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id), 
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined
          )
        )
        .orderBy(desc(meetings.createdAt), desc(meetings.id))
        .limit(pageSize)
        .offset((page - 1) * pageSize)

      const [total] = await db
        .select({ count: count() })
        .from(meetings)
        .innerJoin(agents, eq(meetings.agentId, agents.id))
        .where(
          and(
            eq(meetings.userId, ctx.auth.user.id), 
            search ? ilike(meetings.name, `%${search}%`) : undefined,
            status ? eq(meetings.status, status) : undefined,
            agentId ? eq(meetings.agentId, agentId) : undefined
          ))

      const totalPages = Math.ceil(total.count / pageSize)

      return {
        items: data,
        total: total.count,
        totalPages,
      }
    }),
})
