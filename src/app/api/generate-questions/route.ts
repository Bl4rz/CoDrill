import { NextRequest, NextResponse } from "next/server";
import { callStructured, StructuredTool } from "@/lib/ai";
import { Difficulty, InterviewQuestion, RoleSummary } from "@/lib/types";

const GENERATE_TOOL: StructuredTool = {
  name: "submit_questions",
  description:
    "Submit a freshly generated set of original coding interview questions tailored to the role.",
  parameters: {
    type: "object",
    properties: {
      questions: {
        type: "array",
        minItems: 5,
        maxItems: 8,
        description:
          "Must contain at least 5 and at most 8 question objects. Never submit fewer than 5 — " +
          "count them before calling this tool.",
        items: {
          type: "object",
          properties: {
            question_text: {
              type: "string",
              description:
                "The full coding question a candidate would be asked, self-contained and specific.",
            },
            difficulty: {
              type: "string",
              enum: ["easy", "medium", "hard"],
            },
            topic: {
              type: "string",
              description: "Short topic label, e.g. 'arrays', 'concurrency', 'system design'.",
            },
          },
          required: ["question_text", "difficulty", "topic"],
          additionalProperties: false,
        },
      },
    },
    required: ["questions"],
    additionalProperties: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { role_summary } = (await req.json()) as { role_summary: RoleSummary };

    if (!role_summary || !role_summary.tech_stack) {
      return NextResponse.json({ error: "Missing role_summary." }, { status: 400 });
    }

    const result = await callStructured<{
      questions: { question_text: string; difficulty: Difficulty; topic: string }[];
    }>({
      system:
        "You are a senior software engineering interviewer designing a mock technical interview. " +
        "Generate BETWEEN 5 AND 8 (never fewer than 5 — count before you submit) ORIGINAL coding " +
        "questions you invent yourself right now — never reuse or lightly " +
        "reword well-known questions from LeetCode, HackerRank, Cracking the Coding Interview, or similar " +
        "banks. Tailor every question to the candidate's specific role: match the tech stack, the seniority " +
        "level (junior questions should be more scoped and guided in framing; senior/staff questions should " +
        "involve ambiguity, tradeoffs, or system-level thinking), and the focus areas. Include a genuine mix " +
        "of easy, medium, and hard questions — do NOT order them from easiest to hardest; real interviews " +
        "don't follow a predictable difficulty ramp, and neither should this set. Each question should be " +
        "answerable by writing code in an interview (30-45 min), not a multi-day project.",
      messages: [
        {
          role: "user",
          content: `Role summary:\n${JSON.stringify(role_summary, null, 2)}\n\nGenerate the questions now.`,
        },
      ],
      tool: GENERATE_TOOL,
      maxTokens: 4096,
    });

    const questions: InterviewQuestion[] = result.questions
      .map((q, i) => ({
        id: crypto.randomUUID(),
        question_text: q.question_text,
        difficulty: q.difficulty,
        topic: q.topic,
        order_index: i,
      }));

    return NextResponse.json({ questions });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
