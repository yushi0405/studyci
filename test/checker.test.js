import test from "node:test";
import assert from "node:assert/strict";
import { checkDocument } from "../dist/checker.js";

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
