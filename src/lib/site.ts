export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://co-drill.vercel.app").replace(
  /\/$/,
  "",
);

export const SITE_NAME = "Codrill";

export const SITE_DESCRIPTION =
  "Paste a job posting, get freshly generated coding questions, and run a real mock technical interview with an AI interviewer that scores how you think, not just whether the code runs.";
