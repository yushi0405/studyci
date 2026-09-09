import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { formatGitHubFinding } from "../dist/github.js";

const execFileAsync = promisify(execFile);
const renderer = fileURLToPath(new URL("../scripts/github-annotations.mjs", import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "studyci-github-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, "questions.yaml");
  await writeFile(file, [
    "questions:",
    "  - id: q1",
    "    question: A?",
    "    answer: A",
    "    source: source",
    "  - id: q2",
    "    question: B?",
    "    answer: B",
    ""
  ].join("\n"));
  return { root, file };
}

test("formats a finding as a GitHub annotation with file and line", async (t) => {
  const { root, file } = await fixture(t);
  const output = await formatGitHubFinding({
    severity: "warning",
    code: "missing-source",
    message: "Question has no source reference.",
    file,
    questionId: "q2"
  }, root);

  assert.equal(output, "::warning file=questions.yaml,line=6,title=StudyCI missing-source::Question has no source reference.");
});

test("prefers a source line carried by the finding", async (t) => {
  const { root, file } = await fixture(t);
  const output = await formatGitHubFinding({
    severity: "warning",
    code: "missing-source",
    message: "Question has no source reference.",
    file,
    line: 3,
    questionId: "q2"
  }, root);

  assert.equal(output, "::warning file=questions.yaml,line=3,title=StudyCI missing-source::Question has no source reference.");
});

test("action renderer converts JSON findings into GitHub annotations", async (t) => {
  const { root, file } = await fixture(t);
  const resultFile = join(root, "result.json");
  await writeFile(resultFile, JSON.stringify({ findings: [{
    severity: "error",
    code: "duplicate-id",
    message: "Duplicate question id 'q2'.",
    file,
    line: 3,
    questionId: "q2"
  }] }));

  const { stdout } = await execFileAsync(process.execPath, [renderer, resultFile, root]);
  assert.match(stdout, /::error file=questions\.yaml,line=3,title=StudyCI duplicate-id::Duplicate question id 'q2'\./);
});
