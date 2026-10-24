import { z } from "zod";

/** Unknown keys are dropped, so a reward amount sent by the browser is simply never read. */
export const claimQuestBody = z.object({ quest_id: z.string().min(1).max(64) });
export const timezoneBody = z.object({ timezone: z.string().min(1).max(64) });
export const runQuery = z.object({ session_id: z.string().uuid() });
export const scoreIds = z.object({
  session_id: z.string().uuid().optional(),
  question_id: z.string().uuid().optional(),
});

const short = (max: number) => z.string().trim().min(1).max(max);

export const roleSummarySchema = z.object({
  role_title: short(200),
  seniority: short(100),
  tech_stack: z.array(short(80)).max(40),
  focus_areas: z.array(short(120)).max(40),
});
