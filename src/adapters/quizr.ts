import { extname } from "node:path";
import YAML from "yaml";
import type { CanonicalDocument, CanonicalQuestion, StudyAdapter } from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isQuizrQuestionRecord(value: unknown): boolean {
  return isRecord(value) && ("prompt" in value || "answer" in value || "strict" in value || "image" in value);
}

function looksLikeQuizrId(value: string): boolean {
  return /^q[_-]?\d+$/i.test(value);
}

function isQuizrDocument(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const entries = Object.entries(value);
  if (entries.length === 0) return false;

  const allQuestionRecords = entries.every(([, item]) => isQuizrQuestionRecord(item));
  const allQuizrIds = entries.every(([id]) => looksLikeQuizrId(id));
  return allQuestionRecords || allQuizrIds;
}

function decodeYamlKey(value: string): string {
  try {
    const parsed = YAML.parse(value) as unknown;
    if (typeof parsed === "string" || typeof parsed === "number") return String(parsed);
  } catch {
    // Fall back to the raw key below.
  }
  return value.trim();
}

function topLevelKeyLines(content: string): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const match = line.match(/^([^\s#][^:]*?)\s*:\s*(?:#.*)?$/);
    if (!match) continue;
    const key = decodeYamlKey(match[1]);
    const lines = result.get(key) ?? [];
    lines.push(index + 1);
    result.set(key, lines);
  }
  return result;
}

function nextLine(id: string, linesById: Map<string, number[]>): number | undefined {
  return linesById.get(id)?.shift();
}

function canonicalQuestion(
  path: string,
  id: string,
  raw: unknown,
  linesById: Map<string, number[]>
): CanonicalQuestion {
  const question = isRecord(raw) ? raw : {};
  return {
    id,
    idScope: "file",
    question: typeof question.prompt === "string" ? question.prompt : undefined,
    answer: typeof question.answer === "string" ? { kind: "text", text: question.answer } : undefined,
    location: { file: path, line: nextLine(id, linesById) },
    dialect: "quizr"
  };
}

function parseQuizr(path: string, content: string): CanonicalDocument | null {
  const parsed = YAML.parse(content) as unknown;
  if (!isQuizrDocument(parsed)) return null;

  const linesById = topLevelKeyLines(content);
  return {
    questions: Object.entries(parsed).map(([id, question]) => canonicalQuestion(path, id, question, linesById)),
    capabilities: {
      sourceReferences: false,
      categories: false,
      tags: false
    }
  };
}

export const quizrAdapter: StudyAdapter = {
  name: "quizr",
  supports(path: string): boolean {
    return [".yaml", ".yml"].includes(extname(path).toLowerCase());
  },
  parse(path: string, content: string): CanonicalDocument | null {
    return parseQuizr(path, content);
  }
};
