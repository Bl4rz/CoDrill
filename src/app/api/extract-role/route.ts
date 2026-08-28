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

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripHtml(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/\s+/g, " ")
    .trim();
}

// Many job boards (Workday, Greenhouse, Lever, ...) render the visible page
// client-side, leaving <body> essentially empty in the raw HTML response —
// but they still server-render an og:description/description meta tag with
// the full posting text for link previews and SEO. stripHtml alone discards
// meta tags entirely (it only keeps text *between* tags, and this content
// lives in an attribute), so a page like that would come back empty even
// though the real text was sitting right there in the response.
function extractMetaDescription(html: string): string {
  const match =
    html.match(/<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*property=["']og:description["']/i) ??
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i);
  return match ? decodeHtmlEntities(match[1]).trim() : "";
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
  const bodyText = stripHtml(html);
  const metaText = extractMetaDescription(html);
  const text = metaText.length > bodyText.length ? metaText : bodyText;
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
