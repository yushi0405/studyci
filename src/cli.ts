#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import { checkDocument } from "./checker.js";
import { loadStudyFile } from "./loader.js";
import { loadConfig } from "./config.js";
import { reviewWithOllama } from "./ai/ollama.js";
import type { Finding, LoadedQuestion } from "./types.js";

const VERSION = "0.1.0";
const supported = new Set([".yaml", ".yml", ".md", ".markdown"]);

type Format = "text" | "json";

async function collectFiles(path: string): Promise<string[]> {
  const info = await stat(path);
  if (info.isFile()) return supported.has(extname(path).toLowerCase()) ? [path] : [];
  const entries = await readdir(path, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const child = join(path, entry.name);
    if (entry.isDirectory()) return collectFiles(child);
    return supported.has(extname(entry.name).toLowerCase()) ? [child] : [];
  }))).flat();
}

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function positionalPath(args: string[]): string {
  const candidates = args.filter((arg, index) => !arg.startsWith("--") && (index === 0 || !args[index - 1].startsWith("--")));
  return candidates[0] ?? ".";
}

function formatFinding(f: Finding): string {
  const symbol = f.severity === "error" ? "ERROR" : "WARN ";
  const id = f.questionId ? ` [${f.questionId}]` : "";
  const related = f.relatedQuestionId ? ` (related: ${f.relatedQuestionId})` : "";
  return `${symbol} ${f.code}${id}: ${f.message}${related} (${f.file})`;
}

function printFindings(findings: Finding[], format: Format): void {
  if (format === "json") {
    console.log(JSON.stringify({ findings }, null, 2));
    return;
  }
  for (const finding of findings) console.log(formatFinding(finding));
  if (findings.length === 0) console.log("No findings.");
}

async function loadQuestions(files: string[]): Promise<LoadedQuestion[]> {
  const result: LoadedQuestion[] = [];
  for (const file of files) {
    const doc = await loadStudyFile(file);
    for (const question of doc.questions ?? []) result.push({ file, question });
  }
  return result;
}

async function runCheck(path: string, format: Format): Promise<void> {
  const files = await collectFiles(resolve(path));
  const findings: Finding[] = [];
  let questions = 0;
  const categories: Record<string, number> = {};
  for (const file of files) {
    try {
      const result = checkDocument(file, await loadStudyFile(file));
      findings.push(...result.findings);
      questions += result.questionCount;
      for (const [category, count] of Object.entries(result.categoryCounts)) categories[category] = (categories[category] ?? 0) + count;
    } catch (error) {
      findings.push({ severity: "error", code: "parse-error", message: error instanceof Error ? error.message : String(error), file });
    }
  }
  if (format === "json") console.log(JSON.stringify({ findings, questionCount: questions, fileCount: files.length, categoryCounts: categories }, null, 2));
  else {
    for (const finding of findings) console.log(formatFinding(finding));
    console.log(`\nStudyCI checked ${questions} question(s) in ${files.length} file(s).`);
    console.log(`Errors: ${findings.filter((f) => f.severity === "error").length} | Warnings: ${findings.filter((f) => f.severity === "warning").length}`);
    if (Object.keys(categories).length) {
      console.log("Coverage:");
      for (const [category, count] of Object.entries(categories).sort(([a], [b]) => a.localeCompare(b))) console.log(`  ${category}: ${count}`);
    }
  }
  if (findings.some((f) => f.severity === "error")) process.exitCode = 1;
}

async function runReview(path: string, args: string[], format: Format): Promise<void> {
  const files = await collectFiles(resolve(path));
  const config = await loadConfig();
  if (option(args, "--model")) config.ai.model = option(args, "--model")!;
  if (option(args, "--base-url")) config.ai.baseUrl = option(args, "--base-url")!;
  const findings = await reviewWithOllama(await loadQuestions(files), config.ai);
  printFindings(findings, format);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--version") || args[0] === "version") { console.log(VERSION); return; }
  const command = args.shift();
  if (!command || !["check", "review"].includes(command)) {
    console.error("Usage:\n  studyci check [path] [--format text|json]\n  studyci review [path] [--model qwen3.5:9b] [--base-url http://127.0.0.1:11434] [--format text|json]\n  studyci --version");
    process.exitCode = 2;
    return;
  }
  const format = (option(args, "--format") ?? "text") as Format;
  if (!(["text", "json"] as string[]).includes(format)) throw new Error("--format must be text or json.");
  const path = positionalPath(args);
  if (command === "check") await runCheck(path, format);
  else await runReview(path, args, format);
}

main().catch((error) => {
  console.error(`StudyCI: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
