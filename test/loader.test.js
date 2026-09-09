import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadStudyFile, tryLoadStudyFile } from "../dist/loader.js";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "studyci-loader-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("native YAML adapter normalizes questions and records source lines", async (t) => {
  const root = await fixture(t);
  const file = join(root, "questions.yaml");
  await writeFile(file, [
    "questions:",
    "  - id: q1",
    "    question: A?",
    "    answer: A",
    "    source: source-a",
    "  - id: q2",
    "    question: B?",
    "    answer: B",
    "    source: source-b",
    ""
  ].join("\n"));

  const doc = await loadStudyFile(file);
  assert.equal(doc.questions.length, 2);
  assert.equal(doc.questions[0].dialect, "native");
  assert.deepEqual(doc.questions[0].answer, { kind: "text", text: "A" });
  assert.equal(doc.questions[0].location.line, 2);
  assert.equal(doc.questions[1].location.line, 6);
});

test("native Markdown adapter preserves the current StudyCI syntax", async (t) => {
  const root = await fixture(t);
  const file = join(root, "questions.md");
  await writeFile(file, [
    "# Notes",
    "",
    "```markdown",
    "## ignored-001",
    "Question: Ignore this?",
    "Answer: Yes",
    "```",
    "",
    "## md-001",
    "Question: What is HTTPS?",
    "Answer: HTTP over TLS",
    "Category: networking",
    "Tags: http, tls",
    "Source: RFC 9110",
    ""
  ].join("\n"));

  const doc = await loadStudyFile(file);
  assert.equal(doc.questions.length, 1);
  assert.equal(doc.questions[0].id, "md-001");
  assert.equal(doc.questions[0].question, "What is HTTPS?");
  assert.deepEqual(doc.questions[0].answer, { kind: "text", text: "HTTP over TLS" });
  assert.deepEqual(doc.questions[0].tags, ["http", "tls"]);
  assert.equal(doc.questions[0].location.line, 9);
});

test("directory-style loading still skips unrelated Markdown", async (t) => {
  const root = await fixture(t);
  const file = join(root, "README.md");
  await writeFile(file, "# Project\n\nGeneral documentation.\n");
  assert.equal(await tryLoadStudyFile(file), null);
});
