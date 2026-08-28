import { NextRequest, NextResponse } from "next/server";
import { callStructured, StructuredTool } from "@/lib/ai";
import { AttemptScores, FollowUpQA } from "@/lib/types";

const SCORE_TOOL: StructuredTool = {
  name: "submit_scores",
  description:
    "Submit the interviewer's scoring of this attempt across three independent dimensions.",
  parameters: {
    type: "object",
    properties: {
      correctness_score: {
        type: "integer",
        description:
          "0-100. Does the code correctly and completely solve the problem? Consider bugs, missed edge " +
          "cases in the code itself, and whether it would actually compile/run.",
      },
      communication_score: {
        type: "integer",
        description:
          "0-100. Quality of the approach explanation given BEFORE coding: was it clear, did it identify a " +
          "reasonable strategy, did it surface constraints/edge cases proactively vs. needing prompting.",
      },
      reasoning_score: {
        type: "integer",
        description:
          "0-100. Quality of the follow-up answers about complexity, scaling, and edge cases: accuracy and " +
          "depth of reasoning, not just correctness of the code.",
      },
      feedback_text: {
        type: "string",
        description:
          "2-4 sentences of specific, actionable feedback on this question, written directly to the " +
          "candidate. Mention one concrete strength and one concrete improvement.",
      },
    },
    required: [
      "correctness_score",
      "communication_score",
      "reasoning_score",
      "feedback_text",
    ],
    additionalProperties: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const {
      question_text,
      approach_text,
      code_submission,
      code_language,
      follow_up_qa,
    } = (await req.json()) as {
      question_text: string;
      approach_text: string;
      code_submission: string;
      code_language: string;
      follow_up_qa: FollowUpQA[];
    };

    if (!code_submission) {
      return NextResponse.json({ error: "Missing code_submission." }, { status: 400 });
    }

    const followupText = (follow_up_qa ?? [])
      .map((qa) => `Q: ${qa.question}\nA: ${qa.answer}`)
      .join("\n\n");

    const scores = await callStructured<AttemptScores>({
      system:
        "You are a senior software engineering interviewer scoring a completed interview question. Score " +
        "three dimensions independently and honestly — a technically correct solution with poor communication " +
        "should NOT get a high communication score just because the code works, and vice versa. Be a fair but " +
        "rigorous grader, calibrated to real interview bars.",
      messages: [
        {
          role: "user",
          content:
            `Question:\n${question_text}\n\n` +
            `Approach explanation (given before coding):\n${approach_text}\n\n` +
            `Code (${code_language}):\n\`\`\`${code_language}\n${code_submission}\n\`\`\`\n\n` +
            `Follow-up Q&A:\n${followupText || "(none)"}`,
        },
      ],
      tool: SCORE_TOOL,
      maxTokens: 1024,
    });

    return NextResponse.json({ scores });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
