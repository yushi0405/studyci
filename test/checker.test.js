import test from "node:test";
import assert from "node:assert/strict";
import { checkCrossFileDuplicates, checkDocument } from "../dist/checker.js";

test("detects duplicate ids and missing sources", () => {
  const result = checkDocument("sample.yaml", {
    questions: [
      { id: "q1", question: "A?", answer: "A", source: "source" },
      { id: "q1", question: "B?", answer: "B" }
    ]
  });
  assert.ok(result.findings.some((f) => f.code === "duplicate-id"));
  assert.ok(result.findings.some((f) => f.code === "missing-source"));
});

test("reports category counts", () => {
  const result = checkDocument("sample.yaml", {
    syllabus: { categories: ["networking"] },
    questions: [
      { id: "q1", question: "A?", answer: "A", category: "networking", source: "x" }
    ]
  });
  assert.equal(result.categoryCounts.networking, 1);
});

test("detects duplicate ids and exact questions across files", () => {
  const findings = checkCrossFileDuplicates([
    { file: "a.yaml", question: { id: "q1", question: "What is HTTPS?", answer: "A", source: "x" } },
    { file: "b.yaml", question: { id: "q1", question: "  what   is https?  ", answer: "B", source: "y" } }
  ]);

  const duplicateId = findings.find((f) => f.code === "duplicate-id");
  const duplicateQuestion = findings.find((f) => f.code === "duplicate-question");

  assert.equal(duplicateId?.severity, "error");
  assert.equal(duplicateId?.file, "b.yaml");
  assert.match(duplicateId?.message ?? "", /first seen in 'a\.yaml'/);
  assert.equal(duplicateQuestion?.severity, "warning");
  assert.equal(duplicateQuestion?.relatedQuestionId, "q1");
  assert.match(duplicateQuestion?.message ?? "", /first seen as 'q1' in 'a\.yaml'/);
});

test("file-scoped ids may repeat across files", () => {
  const findings = checkCrossFileDuplicates([
    { file: "a.yaml", question: { id: "q_001", idScope: "file", question: "Question A?", answer: "A" } },
    { file: "b.yaml", question: { id: "q_001", idScope: "file", question: "Question B?", answer: "B" } }
  ]);

  assert.equal(findings.some((finding) => finding.code === "duplicate-id"), false);
});

test("does not duplicate same-file findings at project scope", () => {
  const findings = checkCrossFileDuplicates([
    { file: "a.yaml", question: { id: "q1", question: "A?", answer: "A" } },
    { file: "a.yaml", question: { id: "q1", question: "A?", answer: "A" } }
  ]);

  assert.equal(findings.length, 0);
});
