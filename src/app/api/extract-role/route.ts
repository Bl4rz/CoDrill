import { NextRequest, NextResponse } from "next/server";
import { callStructured, StructuredTool } from "@/lib/ai";
import { RoleSummary } from "@/lib/types";

const EXTRACT_TOOL: StructuredTool = {
  name: "submit_role_summary",
  description:
    "Submit the extracted structured summary of a job posting for a software engineering role.",
  parameters: {
    type: "object",
    properties: {
      role_title: {
        type: "string",
        description: "The job title, e.g. 'Senior Backend Engineer'.",
      },
      seniority: {
        type: "string",
        description:
          "Seniority level implied by the posting, e.g. 'Junior', 'Mid-level', 'Senior', 'Staff'.",
      },
      tech_stack: {
        type: "array",
        items: { type: "string" },
        description:
          "Languages, frameworks, databases, and infrastructure explicitly or strongly implied by the posting.",
      },
      focus_areas: {
        type: "array",
        items: { type: "string" },
        description:
          "Likely technical focus areas for interviews at this role, e.g. 'distributed systems', 'API design', 'data pipelines'.",
      },
    },
    required: ["role_title", "seniority", "tech_stack", "focus_areas"],
    additionalProperties: false,
  },
};

function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  return /^https?:\/\/\S+$/i.test(trimmed) && !trimmed.includes("\n");
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveJobPostingText(input: string): Promise<string> {
  if (!looksLikeUrl(input)) return input;

  const res = await fetch(input.trim(), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; CodrillBot/1.0)" },
  });
  if (!res.ok) {
    throw new Error(
      `Couldn't fetch that URL (status ${res.status}). Paste the job posting text instead.`
    );
  }
  const html = await res.text();
  const text = stripHtml(html);
  if (text.length < 30) {
    throw new Error(
      "Couldn't extract readable text from that URL. Paste the job posting text instead."
    );
  }
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { job_posting_text: rawInput } = await req.json();

    if (!rawInput || typeof rawInput !== "string" || rawInput.trim().length < 10) {
      return NextResponse.json(
        { error: "Paste the job posting text or a URL to the posting." },
        { status: 400 }
      );
    }

    const job_posting_text = await resolveJobPostingText(rawInput);

    if (job_posting_text.trim().length < 30) {
      return NextResponse.json(
        { error: "Paste the full job posting text (at least a few sentences)." },
        { status: 400 }
      );
    }

    const summary = await callStructured<RoleSummary>({
      system:
        "You are an expert technical recruiter and engineering interviewer. Read the job posting and extract a structured summary that will be used to generate tailored coding interview questions. Be specific and avoid generic filler.",
      messages: [
        {
          role: "user",
          content: `Job posting:\n\n${job_posting_text.slice(0, 12000)}`,
        },
      ],
      tool: EXTRACT_TOOL,
      maxTokens: 1024,
    });

    return NextResponse.json({ summary });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
