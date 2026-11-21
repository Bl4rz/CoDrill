// Turns interviewer text into short chunks for the speech model. Short chunks
// matter twice: Kokoro is fastest and most natural on one or two sentences, and
// playback can start as soon as the first chunk is ready instead of waiting for
// the whole message.

const MAX_CHUNK = 220;
const MIN_CHUNK = 24;

/** Markdown and code that should not be read aloud letter by letter. */
export function cleanForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " (code shown on screen) ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_#>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function splitSentences(input: string): string[] {
  const text = cleanForSpeech(input);
  if (!text) return [];
  const sentences = text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)\s*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  const push = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;
    // A very long sentence is cut at commas or, failing that, at spaces.
    const pieces = sentence.length > MAX_CHUNK ? breakLong(sentence) : [sentence];
    for (const piece of pieces) {
      if (current && (current + " " + piece).length > MAX_CHUNK) push();
      current = current ? `${current} ${piece}` : piece;
      if (current.length >= MIN_CHUNK && /[.!?]["')\]]*$/.test(current)) push();
    }
  }
  push();
  return chunks;
}

function breakLong(sentence: string): string[] {
  const out: string[] = [];
  let rest = sentence;
  while (rest.length > MAX_CHUNK) {
    let cut = rest.lastIndexOf(", ", MAX_CHUNK);
    if (cut < MIN_CHUNK) cut = rest.lastIndexOf(" ", MAX_CHUNK);
    if (cut < MIN_CHUNK) cut = MAX_CHUNK;
    out.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) out.push(rest);
  return out;
}
