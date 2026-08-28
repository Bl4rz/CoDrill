import { NextRequest, NextResponse } from "next/server";
import { callStructured, StructuredTool } from "@/lib/ai";
import { ApproachFeedback, ApproachVerdict } from "@/lib/types";

const APPROACH_TOOL: StructuredTool = {
  name: "submit_interviewer_response",
  description:
    "Submit the interviewer's spoken response to the candidate's stated approach, before they start coding.",
  parameters: {
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: ["proceed", "guide"],
        description:
          "'proceed' if the approach is reasonable and the candidate should start coding now. " +
          "'guide' if there is a real flaw, gap, or missing edge case that should be surfaced first.",
      },
      message: {
        type: "string",
        description:
          "What the interviewer says out loud, in first person, conversational. If verdict is 'proceed', " +
          "briefly acknowledge the approach and invite them to start coding — do not restate their whole plan. " +
          "If verdict is 'guide', ask ONE short, specific guiding question that nudges them toward the gap " +
          "themselves. Never state the flaw outright or give away the fix.",
      },
    },
    required: ["verdict", "message"],
    additionalProperties: false,
  },
};

export async function POST(req: NextRequest) {
  try {
    const { question_text, approach_text, prior_rounds } = (await req.json()) as {
      question_text: string;
      approach_text: string;
      prior_rounds?: ApproachFeedback[];
    };

    if (!question_text || !approach_text || approach_text.trim().length < 5) {
      return NextResponse.json(
        { error: "Describe your approach before submitting." },
        { status: 400 }
      );
    }

    const guideRounds = (prior_rounds ?? []).filter((r) => r.verdict === "guide").length;

    // A real interviewer moves on after the candidate has engaged with a couple of
    // solid follow-ups — drilling indefinitely isn't realistic and traps the user.
    if (guideRounds >= 2) {
      return NextResponse.json({
        feedback: {
          verdict: "proceed",
          message: "Good discussion — let's see it in code.",
        } satisfies ApproachFeedback,
      });
    }

    const history = (prior_rounds ?? [])
      .map((r, i) => `Round ${i + 1} interviewer response (${r.verdict}): ${r.message}`)
      .join("\n");

    const feedback = await callStructured<{ verdict: ApproachVerdict; message: string }>({
      system:
        "You are conducting a live mock technical interview, playing the role of a real, warm but rigorous " +
        "interviewer. The candidate must explain their approach before writing code. Your job right now is " +
        "only to react to their SPOKEN APPROACH, not their code (there is none yet). If the approach is sound " +
        "for the question at hand, say so briefly and let them proceed to code. If it has a real gap (wrong " +
        "complexity assumption, missed edge case, unclear data structure choice, etc.), do NOT lecture or give " +
        "the answer — ask a single short guiding question a real interviewer would ask to nudge them there " +
        "themselves. Keep responses to 1-3 sentences, natural spoken register. " +
        "Real interviewers move on after establishing basic competence — they do not interrogate a candidate " +
        "indefinitely. If the candidate has already addressed a prior guiding question with a correct, " +
        "specific answer, default to 'proceed' unless there is a genuinely new and significant gap you " +
        "haven't raised yet; do not manufacture increasingly minor nitpicks just to keep asking questions.",
      messages: [
        {
          role: "user",
          content:
            `Question given to candidate:\n${question_text}\n\n` +
            (history ? `Prior exchange this question:\n${history}\n\n` : "") +
            `Candidate's approach:\n${approach_text}`,
        },
      ],
      tool: APPROACH_TOOL,
      maxTokens: 512,
    });

    return NextResponse.json({ feedback });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
