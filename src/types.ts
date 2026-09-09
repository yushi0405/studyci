export interface StudyQuestion {
  id: string;
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  source?: string;
}

export interface StudyDocument {
  questions: StudyQuestion[];
  syllabus?: { categories?: string[] };
}

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  file: string;
  questionId?: string;
  relatedQuestionId?: string;
}

export interface CheckResult {
  findings: Finding[];
  questionCount: number;
  categoryCounts: Record<string, number>;
}

export interface OllamaConfig {
  provider: "ollama";
  model: string;
  baseUrl: string;
  timeoutMs: number;
  maxQuestions: number;
}

export interface StudyCIConfig {
  ai: OllamaConfig;
}

export interface LoadedQuestion {
  file: string;
  question: StudyQuestion;
}
