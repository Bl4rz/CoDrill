import { z } from "zod";
import { ADVENTURE, PHASES } from "@/lib/adventure/config";

const attemptId = z.string().uuid();

/** Request bodies. Unknown keys (a "score", "hp", "xp" or "unlocked" from the browser) are dropped and never read. */
export const startBody = z.object({ level_id: z.string().trim().min(1).max(40) });
export const attemptQuery = z.object({ attempt_id: attemptId });
export const hintBody = z.object({
  attempt_id: attemptId,
  phase: z.enum(PHASES),
  draft: z.string().max(ADVENTURE.limits.code).optional(),
});
export const followupsBody = z.object({ attempt_id: attemptId });
export const finishBody = z.object({ attempt_id: attemptId });

export const phaseBody = z.discriminatedUnion("phase", [
  z.object({
    attempt_id: attemptId,
    phase: z.literal("approach"),
    approach_text: z.string().trim().min(5).max(ADVENTURE.limits.approach),
  }),
  z.object({
    attempt_id: attemptId,
    phase: z.literal("code"),
    code: z.string().trim().min(3).max(ADVENTURE.limits.code),
    language: z.enum(["javascript", "python", "java"]),
  }),
  z.object({
    attempt_id: attemptId,
    phase: z.literal("defend"),
    answers: z.array(z.string().trim().min(1).max(ADVENTURE.limits.answer)).min(1).max(3),
  }),
]);

/** What the AI is allowed to hand back. Anything else is treated as a failed call, never a result. */
export const questionOut = z.object({ question_text: z.string().trim().min(40).max(2500) });
export const hintOut = z.object({ hint: z.string().trim().min(5).max(600) });
export const followupsOut = z.object({ questions: z.array(z.string().trim().min(5).max(300)).min(1).max(2) });
export const scoreOut = z.object({
  score: z.number().finite().min(0).max(100),
  feedback: z.string().trim().min(5).max(1500),
});
