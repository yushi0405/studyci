#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { loadStudyFile } from "./loader.js";
import { checkDocument } from "./checker.js";
const supported = new Set([".yaml", ".yml", ".md", ".markdown"]);
async function collectFiles(path) {
  const info = await stat(path);
  if (info.isFile()) return supported.has(extname(path).toLowerCase()) ? [path] : [];
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return collectFiles(child);
    return supported.has(extname(entry.name).toLowerCase()) ? [child] : [];
  }));
  return nested.flat();
}
function formatFinding(f) {
  const symbol = f.severity === "error" ? "ERROR" : "WARN ";
  const id = f.questionId ? ` [${f.questionId}]` : "";
  return `${symbol} ${f.code}${id}: ${f.message} (${f.file})`;
}
async function main() {
  const [command, rawPath = "."] = process.argv.slice(2);
  if (command !== "check") {
    console.error("Usage: studyci check <path>");
    process.exitCode = 2;
    return;
  }
  const target = resolve(rawPath);
  const files = await collectFiles(target);
  let errors = 0, warnings = 0, questions = 0;
  const categories = {};
  for (const file of files) {
    try {
      const doc = await loadStudyFile(file);
      const result = checkDocument(file, doc);
      questions += result.questionCount;
      for (const [category, count] of Object.entries(result.categoryCounts)) categories[category] = (categories[category] ?? 0) + count;
      for (const finding of result.findings) {
        console.log(formatFinding(finding));
        if (finding.severity === "error") errors += 1; else warnings += 1;
      }
    } catch (error) {
      errors += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`ERROR parse-error: ${message} (${file})`);
    }
  }
  console.log("");
  console.log(`StudyCI checked ${questions} question(s) in ${files.length} file(s).`);
  console.log(`Errors: ${errors} | Warnings: ${warnings}`);
  const categoryEntries = Object.entries(categories).sort(([a], [b]) => a.localeCompare(b));
  if (categoryEntries.length > 0) {
    console.log("Coverage:");
    for (const [category, count] of categoryEntries) console.log(`  ${category}: ${count}`);
  }
  if (errors > 0) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
