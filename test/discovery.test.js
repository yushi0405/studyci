import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const cli = new URL("../dist/cli.js", import.meta.url);

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
  await writeFile(join(root, "README.md"), "# Project\n\nGeneral documentation.\n");
  await writeFile(join(root, ".github", "workflows", "ci.yml"), "name: CI\non: [push]\n");
  await writeFile(join(root, "node_modules", "pkg", "README.md"), "# Dependency\n");

  const { stdout } = await execFileAsync(process.execPath, [cli.pathname, "check", root]);
  assert.match(stdout, /StudyCI checked 1 question\(s\) in 1 file\(s\)\./);
  assert.doesNotMatch(stdout, /parse-error/);
});

test("explicit non-StudyCI file remains a strict error", async (t) => {
  const root = await fixture(t);
  const file = join(root, "notes.yaml");
  await writeFile(file, "name: unrelated\nvalue: 1\n");

  await assert.rejects(
    execFileAsync(process.execPath, [cli.pathname, "check", file]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stdout, /parse-error/);
      assert.match(error.stdout, /does not contain a StudyCI question document/);
      return true;
    }
  );
});
