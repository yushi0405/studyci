import type { CanonicalAnswer, CanonicalDocument, CanonicalQuestion, CheckResult, Finding, LoadedQuestion } from "./types.js";

function normalized(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function answerText(answer: CanonicalAnswer | string | undefined): string {
  if (typeof answer === "string") return answer;
  if (!answer) return "";
  if (answer.kind === "text") return answer.text;
  return answer.correct.filter((item) => typeof item === "string" && item.trim()).join(" | ");
}

function questionLine(question: CanonicalQuestion): number | undefined {
  return typeof question.location?.line === "number" ? question.location.line : undefined;
}

export function checkDocument(file: string, doc: CanonicalDocument): CheckResult {
  const findings: Finding[] = [];
  const idSeen = new Map<string, CanonicalQuestion>();
  const questionSeen = new Map<string, CanonicalQuestion>();
  const categoryCounts: Record<string, number> = {};
  const allowedCategories = new Set(doc.syllabus?.categories ?? []);

  if (doc.invalidQuestionsArray || !Array.isArray(doc.questions)) {
    findings.push({
      severity: "error",
      code: "invalid-document",
      message: "The document must contain a questions array.",
      file
    });
    return { findings, questionCount: 0, categoryCounts };
  }

  for (const [index, q] of doc.questions.entries()) {
    const fallback = `question #${index + 1}`;
    const id = typeof q?.id === "string" ? q.id.trim() : "";
    const question = typeof q?.question === "string" ? q.question.trim() : "";
    const answer = answerText(q?.answer as CanonicalAnswer | string | undefined).trim();
    const line = questionLine(q);

    for (const [field, value] of [["id", id], ["question", question], ["answer", answer]] as const) {
      if (!value) {
        findings.push({
          severity: "error",
          code: "required-field",
          message: `${fallback} is missing required field '${field}'.`,
          file,
          line,
          questionId: id || undefined
        });
      }
    }

    if (id) {
      if (idSeen.has(id)) {
        findings.push({
          severity: "error",
          code: "duplicate-id",
          message: `Duplicate question id '${id}'.`,
          file,
          line,
          questionId: id
        });
      } else {
        idSeen.set(id, q);
      }
    }

    if (question) {
      const key = normalized(question);
      const previous = questionSeen.get(key);
      if (previous) {
        findings.push({
          severity: "warning",
          code: "duplicate-question",
          message: `Exact duplicate question text; first seen as '${previous.id ?? "unidentified"}'.`,
          file,
          line,
          questionId: id || undefined
        });
      } else {
        questionSeen.set(key, q);
      }
    }

    if (!q?.source || !String(q.source).trim()) {
      findings.push({
        severity: "warning",
        code: "missing-source",
        message: "Question has no source reference.",
        file,
        line,
        questionId: id || undefined
      });
    }

    if (q?.category) {
      const category = String(q.category);
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
      if (allowedCategories.size > 0 && !allowedCategories.has(category)) {
        findings.push({
          severity: "warning",
          code: "unknown-category",
          message: `Category '${category}' is not declared in syllabus.categories.`,
          file,
          line,
          questionId: id || undefined
        });
      }
    }

    if (q?.tags !== undefined && (!Array.isArray(q.tags) || q.tags.some((tag) => typeof tag !== "string"))) {
      findings.push({
        severity: "error",
        code: "invalid-tags",
        message: "tags must be an array of strings.",
        file,
        line,
        questionId: id || undefined
      });
    }
  }

  return { findings, questionCount: doc.questions.length, categoryCounts };
}

export function checkCrossFileDuplicates(items: LoadedQuestion[]): Finding[] {
  const findings: Finding[] = [];
  const idSeen = new Map<string, LoadedQuestion>();
  const questionSeen = new Map<string, LoadedQuestion>();

  for (const item of items) {
    const { file, question } = item;
    const id = typeof question?.id === "string" ? question.id.trim() : "";
    const text = typeof question?.question === "string" ? question.question.trim() : "";
    const line = questionLine(question);

    if (id) {
      const previous = idSeen.get(id);
      if (previous && previous.file !== file) {
        findings.push({
          severity: "error",
          code: "duplicate-id",
          message: `Duplicate question id '${id}' across files; first seen in '${previous.file}'.`,
          file,
          line,
          questionId: id
        });
      } else if (!previous) {
        idSeen.set(id, item);
      }
    }

    if (text) {
      const key = normalized(text);
      const previous = questionSeen.get(key);
      if (previous && previous.file !== file) {
        const previousId = previous.question.id?.trim();
        findings.push({
          severity: "warning",
          code: "duplicate-question",
          message: `Exact duplicate question text across files; first seen as '${previousId ?? "unidentified"}' in '${previous.file}'.`,
          file,
          line,
          questionId: id || undefined,
          relatedQuestionId: previousId || undefined
        });
      } else if (!previous) {
        questionSeen.set(key, item);
      }
    }
  }

  return findings;
}
