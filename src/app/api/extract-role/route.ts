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

// Blocks loopback, private (RFC1918), and link-local ranges — the last of
// which is how cloud metadata services (169.254.169.254 on AWS/GCP/Azure)
// are reached. Without this, "paste a job posting URL" is a server-side
// fetch an attacker fully controls: a request to an internal service or the
// metadata endpoint, issued from our server, with our server's credentials.
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^\[::1\]$/,
  /^f[cd][0-9a-f]{2}:/i,
  /^fe80:/i,
];

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return BLOCKED_HOSTNAME_PATTERNS.some((re) => re.test(h));
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

  let parsed: URL;
  try {
    parsed = new URL(input.trim());
  } catch {
    throw new Error("That doesn't look like a valid URL. Paste the job posting text instead.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http/https URLs are supported. Paste the job posting text instead.");
  }
  if (isBlockedHost(parsed.hostname)) {
    throw new Error("That URL can't be fetched. Paste the job posting text instead.");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CodrillBot/1.0)" },
      // Don't auto-follow redirects — a public-looking URL could 302 to an
      // internal address, bypassing the hostname check above entirely.
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("That URL took too long to respond. Paste the job posting text instead.");
    }
    throw new Error("Couldn't reach that URL. Paste the job posting text instead.");
  } finally {
    clearTimeout(timeout);
  }

  if (res.status >= 300 && res.status < 400) {
    throw new Error(
      "That URL redirects elsewhere and can't be followed automatically. Paste the job posting text instead."
    );
  }
  if (!res.ok) {
    throw new Error(
      `Couldn't fetch that URL (status ${res.status}). Paste the job posting text instead.`
    );
  }
  // Bound worst-case memory/CPU regardless of what the server claims via
  // Content-Length — the regex passes below run over this whole string.
  const html = (await res.text()).slice(0, 2_000_000);
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
