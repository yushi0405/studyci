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
  syllabus?: {
    categories?: string[];
  };
}

export type Severity = "error" | "warning";

export interface Finding {
  severity: Severity;
  code: string;
  message: string;
  file: string;
  questionId?: string;
}

export interface CheckResult {
  findings: Finding[];
  questionCount: number;
  categoryCounts: Record<string, number>;
}
