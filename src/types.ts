export type CanonicalAnswer =
  | { kind: "text"; text: string }
  | { kind: "choices"; correct: string[]; options?: string[] };

export interface SourceLocation {
  file: string;
  line?: number;
}

export interface CanonicalQuestion {
  id?: string;
  question?: string;
  answer?: CanonicalAnswer;
  category?: string;
  tags?: unknown;
  source?: string;
  location: SourceLocation;
  dialect: string;
}

export interface CanonicalDocument {
  questions: CanonicalQuestion[];
  syllabus?: { categories?: string[] };
  invalidQuestionsArray?: boolean;
}

export interface StudyAdapter {
  name: string;
  supports(path: string): boolean;
  parse(path: string, content: string): CanonicalDocument | null;
}

// Backward-compatible internal aliases while the canonical model is introduced.
export type StudyQuestion = CanonicalQuestion;
export type StudyDocument = CanonicalDocument;

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  file: string;
  line?: number;
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
  question: CanonicalQuestion;
}
