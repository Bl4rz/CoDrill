import Groq, {
  APIConnectionError,
  APIError,
  AuthenticationError,
  BadRequestError,
  PermissionDeniedError,
  RateLimitError,
} from "groq-sdk";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat/completions";

let client: Groq | null = null;

function getClient(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set. Add it to .env.local to enable AI features.");
  }
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

export const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

export type { ChatCompletionMessageParam as AiMessageParam };

export interface StructuredTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

/**
 * gpt-oss (a reasoning model) can fail a forced tool call in a few ways that
 * are all nondeterministic and usually fixed by simply trying again: skipping
 * the tool call entirely after burning its budget on hidden reasoning, calling
 * it with output that doesn't satisfy the JSON schema (e.g. an array with
 * fewer items than minItems requires), or emitting malformed JSON (e.g. a
 * stray trailing character) that fails to parse at all. Groq tags every one
 * of these as error code "tool_use_failed" — check that first since it's
 * robust to message wording changes, with message-substring matching as a
 * fallback for older/differently-shaped error bodies.
 */
function isRetryableGenerationError(err: unknown): boolean {
  if (!(err instanceof BadRequestError)) return false;
  const body = err.error as { error?: { code?: string } } | { code?: string } | undefined;
  const code =
    (body as { error?: { code?: string } })?.error?.code ?? (body as { code?: string })?.code;
  if (code === "tool_use_failed") return true;
  return (
    /did not call a tool/i.test(err.message) ||
    /did not match schema/i.test(err.message) ||
    /failed to parse tool call arguments/i.test(err.message)
  );
}

async function attemptStructuredCall<T>(
  groq: Groq,
  options: {
    system: string;
    messages: ChatCompletionMessageParam[];
    tool: StructuredTool;
    maxTokens?: number;
  },
  retryReminder?: string
): Promise<T> {
  const messages = retryReminder
    ? [...options.messages, { role: "user" as const, content: retryReminder }]
    : options.messages;

  const response = await groq.chat.completions.create({
    model: MODEL,
    max_tokens: Math.max(options.maxTokens ?? 4096, 1536),
    reasoning_effort: "low",
    messages: [{ role: "system", content: options.system }, ...messages],
    tools: [
      {
        type: "function",
        function: {
          name: options.tool.name,
          description: options.tool.description,
          parameters: options.tool.parameters,
        },
      },
    ],
    tool_choice: { type: "function", function: { name: options.tool.name } },
  });

  const toolCall = response.choices[0]?.message?.tool_calls?.[0];
  if (!toolCall) {
    throw new Error("Model did not return the expected tool call");
  }
  try {
    return JSON.parse(toolCall.function.arguments) as T;
  } catch {
    throw new Error("Model returned malformed JSON for the tool call.");
  }
}

export async function callStructured<T>(options: {
  system: string;
  messages: ChatCompletionMessageParam[];
  tool: StructuredTool;
  maxTokens?: number;
}): Promise<T> {
  const groq = getClient();
  const maxAttempts = 3;
  let lastErr: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const retryReminder =
        attempt > 1
          ? `Your previous response to ${options.tool.name} failed — either it didn't fully satisfy the tool's schema (e.g. an array with too few items) or it wasn't valid JSON (e.g. a stray trailing character). Re-read the tool's parameter requirements carefully, especially any minimum array length, and call ${options.tool.name} again with well-formed output that fully satisfies them.`
          : undefined;
      return await attemptStructuredCall<T>(groq, options, retryReminder);
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts && isRetryableGenerationError(err)) continue;
      throw new Error(describeGroqError(err));
    }
  }
  throw new Error(describeGroqError(lastErr));
}

function describeGroqError(err: unknown): string {
  if (err instanceof AuthenticationError) {
    return "The Groq API key is invalid. Check GROQ_API_KEY in .env.local.";
  }
  if (err instanceof PermissionDeniedError) {
    return "This Groq API key doesn't have permission for this request.";
  }
  if (err instanceof RateLimitError) {
    return "Groq is rate-limiting this key right now — wait a moment and try again.";
  }
  if (err instanceof BadRequestError) {
    return `The AI request was invalid: ${err.message}`;
  }
  if (err instanceof APIConnectionError) {
    return "Couldn't reach the Groq API — check your network connection.";
  }
  if (err instanceof APIError) {
    return `Groq API error (${err.status}): ${err.message}`;
  }
  return err instanceof Error ? err.message : "Unknown error calling the Groq API.";
}
