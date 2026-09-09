import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "studyci-discovery-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "questions"), { recursive: true });
  await mkdir(join(root, ".github", "workflows"), { recursive: true });
  await mkdir(join(root, "node_modules", "pkg"), { recursive: true });
  return root;
}

test("directory scan ignores common directories and skips non-StudyCI documents", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "questions", "valid.yaml"), "questions:\n  - id: q1\n    question: A?\n    answer: A\n    source: source\n");
  await writeFile(join(root, "README.md"), "# Project\n\nGeneral documentation.\n\n```markdown\n## example-001\nQuestion: Example?\nAnswer: Example\n```\n");
  await writeFile(join(root, ".github", "workflows", "ci.yml"), "name: CI\non: [push]\n");
  await writeFile(join(root, "node_modules", "pkg", "README.md"), "# Dependency\n");

  const { stdout } = await execFileAsync(process.execPath, [cli, "check", root]);
  assert.match(stdout, /StudyCI checked 1 question\(s\) in 1 file\(s\)\./);
  assert.doesNotMatch(stdout, /parse-error/);
});

test("explicit unsupported study file remains a strict error", async (t) => {
  const root = await fixture(t);
  const file = join(root, "notes.yaml");
  await writeFile(file, "name: unrelated\nvalue: 1\n");

  await assert.rejects(
    execFileAsync(process.execPath, [cli, "check", file]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /parse-error/);
      assert.match(error.stdout, /does not contain a supported study question document/);
      return true;
    }
  );
});

test("directory check reports duplicate ids and questions across files", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "questions", "a.yaml"), "questions:\n  - id: shared-001\n    question: What is HTTPS?\n    answer: A\n    source: source-a\n");
  await writeFile(join(root, "questions", "b.yaml"), "questions:\n  - id: shared-001\n    question: what   is https?\n    answer: B\n    source: source-b\n");

  await assert.rejects(
    execFileAsync(process.execPath, [cli, "check", root]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /ERROR duplicate-id \[shared-001\]/);
      assert.match(error.stdout, /across files/);
      assert.match(error.stdout, /WARN\s+duplicate-question \[shared-001\]/);
      assert.match(error.stdout, /StudyCI checked 2 question\(s\) in 2 file\(s\)\./);
      return true;
    }
  );
});

test("QUIZR files are auto-detected and file-scoped ids do not conflict", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "questions", "a.yaml"), "q_001:\n  prompt: Question A?\n  answer: A\n");
  await writeFile(join(root, "questions", "b.yaml"), "q_001:\n  prompt: Question B?\n  answer: B\n");

  const { stdout } = await execFileAsync(process.execPath, [cli, "check", root]);
  assert.match(stdout, /StudyCI checked 2 question\(s\) in 2 file\(s\)\./);
  assert.doesNotMatch(stdout, /ERROR duplicate-id/);
  assert.match(stdout, /WARN\s+missing-source \[q_001\]/);
});
