export type Difficulty = "easy" | "medium" | "hard";

export type CodeLanguage = "javascript" | "python" | "java";

export interface RoleSummary {
  tech_stack: string[];
  seniority: string;
  focus_areas: string[];
  role_title: string;
}

export interface InterviewQuestion {
  id: string;
  question_text: string;
  difficulty: Difficulty;
  order_index: number;
  topic: string;
}

export interface FollowUpQA {
  question: string;
  answer: string;
}

export type ApproachVerdict = "proceed" | "guide";

export interface ApproachFeedback {
  verdict: ApproachVerdict;
  message: string;
}

export interface AttemptScores {
  correctness_score: number;
  communication_score: number;
  reasoning_score: number;
  feedback_text: string;
}

export interface Attempt {
  question_id: string;
  approach_text: string;
  approach_rounds: ApproachFeedback[];
  code_submission: string;
  code_language: CodeLanguage;
  follow_up_qa: FollowUpQA[];
  scores: AttemptScores | null;
}

export interface PatternInsight {
  title: string;
  detail: string;
}

export interface SessionReport {
  summary_text: string;
  pattern_insights: PatternInsight[];
  practice_recommendations: string[];
}
