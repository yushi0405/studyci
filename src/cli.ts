#!/usr/bin/env node
import { resolve } from "node:path";
import { checkCrossFileDuplicates, checkDocument } from "./checker.js";
import { discoverFiles } from "./discovery.js";
import { loadStudyFile, tryLoadStudyFile } from "./loader.js";
import { loadConfig } from "./config.js";
import { reviewWithOllama } from "./ai/ollama.js";
import type { Finding, LoadedQuestion, StudyDocument } from "./types.js";

const VERSION = "0.1.0";
const valueOptions = new Set(["--model", "--base-url", "--format"]);

type Format = "text" | "json";

function option(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

function positionalPath(args: string[]): string {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (valueOptions.has(arg)) {
      index += 1;
      continue;
    }
    if (arg.startsWith("--")) continue;
    return arg;
  }
  return ".";
}

function formatFinding(f: Finding): string {
  const symbol = f.severity === "error" ? "ERROR" : "WARN ";
  const id = f.questionId ? ` [${f.questionId}]` : "";
  const related = f.relatedQuestionId ? ` (related: ${f.relatedQuestionId})` : "";
  return `${symbol} ${f.code}${id}: ${f.message}${related} (${f.file})`;
}

function printFindings(findings: Finding[], format: Format, quiet = false): void {
  if (format === "json") {
    console.log(JSON.stringify({ findings }, null, 2));
    return;
  }
  for (const finding of findings) console.log(formatFinding(finding));
  if (findings.length === 0 && !quiet) console.log("No findings.");
}

async function loadDocument(file: string, explicitFile: boolean): Promise<StudyDocument | null> {
  return explicitFile ? loadStudyFile(file) : tryLoadStudyFile(file);
}

async function loadQuestions(files: string[], explicitFile: boolean): Promise<LoadedQuestion[]> {
  const result: LoadedQuestion[] = [];
  for (const file of files) {
    const doc = await loadDocument(file, explicitFile);
    if (!doc) continue;
    for (const question of doc.questions ?? []) result.push({ file, question });
  }
  return result;
}

async function runCheck(path: string, format: Format): Promise<void> {
  const { files, explicitFile } = await discoverFiles(resolve(path));
  const findings: Finding[] = [];
  const projectQuestions: LoadedQuestion[] = [];
  let questions = 0;
  let checkedFiles = 0;
  const categories: Record<string, number> = {};

  for (const file of files) {
    try {
      const doc = await loadDocument(file, explicitFile);
      if (!doc) continue;
      checkedFiles += 1;
      const result = checkDocument(file, doc);
      findings.push(...result.findings);
      questions += result.questionCount;
      if (Array.isArray(doc.questions)) {
        for (const question of doc.questions) projectQuestions.push({ file, question });
      }
      for (const [category, count] of Object.entries(result.categoryCounts)) categories[category] = (categories[category] ?? 0) + count;
    } catch (error) {
      findings.push({ severity: "error", code: "parse-error", message: error instanceof Error ? error.message : String(error), file });
    }
  }

  findings.push(...checkCrossFileDuplicates(projectQuestions));

  if (format === "json") console.log(JSON.stringify({ findings, questionCount: questions, fileCount: checkedFiles, categoryCounts: categories }, null, 2));
  else {
    for (const finding of findings) console.log(formatFinding(finding));
    console.log(`\nStudyCI checked ${questions} question(s) in ${checkedFiles} file(s).`);
    console.log(`Errors: ${findings.filter((f) => f.severity === "error").length} | Warnings: ${findings.filter((f) => f.severity === "warning").length}`);
    if (Object.keys(categories).length) {
      console.log("Coverage:");
      for (const [category, count] of Object.entries(categories).sort(([a], [b]) => a.localeCompare(b))) console.log(`  ${category}: ${count}`);
    }
  }
  if (findings.some((f) => f.severity === "error")) process.exitCode = 1;
}

async function runReview(path: string, args: string[], format: Format): Promise<void> {
  const { files, explicitFile } = await discoverFiles(resolve(path));
  const config = await loadConfig();
  if (option(args, "--model")) config.ai.model = option(args, "--model")!;
  if (option(args, "--base-url")) config.ai.baseUrl = option(args, "--base-url")!;
  const quiet = hasFlag(args, "--quiet");
  const questions = await loadQuestions(files, explicitFile);
  const startedAt = Date.now();

  if (format === "text" && !quiet) {
    console.log("StudyCI AI review");
    console.log(`Model: ${config.ai.model}`);
    console.log(`Endpoint: ${config.ai.baseUrl}`);
    const reviewedCount = Math.min(questions.length, config.ai.maxQuestions);
    const suffix = reviewedCount < questions.length ? ` (first ${reviewedCount} of ${questions.length})` : "";
    console.log(`Reviewing ${reviewedCount} question(s)${suffix}...`);
    console.log("");
  }

  const findings = await reviewWithOllama(questions, config.ai);
  printFindings(findings, format, quiet);

  if (format === "text" && !quiet) {
    const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log("");
    console.log(`Completed in ${elapsedSeconds}s.`);
    console.log(`${findings.length} finding(s).`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes("--version") || args[0] === "version") { console.log(VERSION); return; }
  const command = args.shift();
  if (!command || !["check", "review"].includes(command)) {
    console.error("Usage:\n  studyci check [path] [--format text|json]\n  studyci review [path] [--model qwen3.5:9b] [--base-url http://127.0.0.1:11434] [--format text|json] [--quiet]\n  studyci --version");
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
