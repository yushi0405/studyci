import type { CheckResult, Finding, LoadedQuestion, StudyDocument, StudyQuestion } from "./types.js";

function normalized(text: string): string {
  return text.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function checkDocument(file: string, doc: StudyDocument): CheckResult {
  const findings: Finding[] = [];
  const idSeen = new Map<string, StudyQuestion>();
  const questionSeen = new Map<string, StudyQuestion>();
  const categoryCounts: Record<string, number> = {};
  const allowedCategories = new Set(doc.syllabus?.categories ?? []);

  if (!Array.isArray(doc.questions)) {
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

    for (const field of ["id", "question", "answer"] as const) {
      if (typeof q?.[field] !== "string" || !q[field].trim()) {
        findings.push({
          severity: "error",
          code: "required-field",
          message: `${fallback} is missing required field '${field}'.`,
          file,
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
          questionId: id
        });
      } else {
        idSeen.set(id, q);
      }
    }

    if (typeof q?.question === "string" && q.question.trim()) {
      const key = normalized(q.question);
      const previous = questionSeen.get(key);
      if (previous) {
        findings.push({
          severity: "warning",
          code: "duplicate-question",
          message: `Exact duplicate question text; first seen as '${previous.id}'.`,
          file,
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
        questionId: id || undefined
      });
    }

    if (q?.category) {
      categoryCounts[q.category] = (categoryCounts[q.category] ?? 0) + 1;
      if (allowedCategories.size > 0 && !allowedCategories.has(q.category)) {
        findings.push({
          severity: "warning",
          code: "unknown-category",
          message: `Category '${q.category}' is not declared in syllabus.categories.`,
          file,
          questionId: id || undefined
        });
      }
    }

    if (q?.tags !== undefined && (!Array.isArray(q.tags) || q.tags.some((t) => typeof t !== "string"))) {
      findings.push({
        severity: "error",
        code: "invalid-tags",
        message: "tags must be an array of strings.",
        file,
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

    if (id) {
      const previous = idSeen.get(id);
      if (previous && previous.file !== file) {
        findings.push({
          severity: "error",
          code: "duplicate-id",
          message: `Duplicate question id '${id}' across files; first seen in '${previous.file}'.`,
          file,
          questionId: id
        });
      } else if (!previous) {
        idSeen.set(id, item);
      }
    }

    if (typeof question?.question === "string" && question.question.trim()) {
      const key = normalized(question.question);
      const previous = questionSeen.get(key);
      if (previous && previous.file !== file) {
        findings.push({
          severity: "warning",
          code: "duplicate-question",
          message: `Exact duplicate question text across files; first seen as '${previous.question.id}' in '${previous.file}'.`,
          file,
          questionId: id || undefined,
          relatedQuestionId: previous.question.id
        });
      } else if (!previous) {
        questionSeen.set(key, item);
      }
    }
  }

  return findings;
}
