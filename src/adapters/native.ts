import { extname } from "node:path";
import YAML from "yaml";
import type { CanonicalDocument, CanonicalQuestion, StudyAdapter } from "../types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isQuestionLike(value: unknown): boolean {
  return isRecord(value) && ("id" in value || "question" in value || "answer" in value);
}

function textAnswer(value: unknown): CanonicalQuestion["answer"] {
  return typeof value === "string" ? { kind: "text", text: value } : undefined;
}

function optionalString(value: unknown): string | undefined {
  return value ? String(value) : undefined;
}

function extractSyllabus(value: unknown): CanonicalDocument["syllabus"] {
  if (!isRecord(value) || !Array.isArray(value.categories)) return undefined;
  return { categories: value.categories.filter((category): category is string => typeof category === "string") };
}

function unquoteYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed.replace(/\s+#.*$/, "").trim();
}

function yamlIdLines(content: string): Map<string, number[]> {
  const result = new Map<string, number[]>();
  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const match = line.match(/^\s*(?:-\s*)?id\s*:\s*(.*?)\s*$/i);
    if (!match) continue;
    const id = unquoteYamlScalar(match[1]);
    const lines = result.get(id) ?? [];
    lines.push(index + 1);
    result.set(id, lines);
  }
  return result;
}

function nextYamlLine(id: string | undefined, linesById: Map<string, number[]>): number | undefined {
  if (!id) return undefined;
  return linesById.get(id)?.shift();
}

function canonicalYamlQuestion(
  path: string,
  raw: unknown,
  linesById: Map<string, number[]>
): CanonicalQuestion {
  const question = isRecord(raw) ? raw : {};
  const id = typeof question.id === "string" ? question.id : undefined;

  return {
    id,
    question: typeof question.question === "string" ? question.question : undefined,
    answer: textAnswer(question.answer),
    category: optionalString(question.category),
    tags: question.tags,
    source: optionalString(question.source),
    location: { file: path, line: nextYamlLine(id, linesById) },
    dialect: "native"
  };
}

function parseYaml(path: string, content: string): CanonicalDocument | null {
  const parsed = YAML.parse(content) as unknown;
  const linesById = yamlIdLines(content);

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { questions: [] };
    if (!parsed.every(isQuestionLike)) return null;
    return { questions: parsed.map((question) => canonicalYamlQuestion(path, question, linesById)) };
  }

  if (!isRecord(parsed) || !("questions" in parsed)) return null;

  const syllabus = extractSyllabus(parsed.syllabus);
  if (!Array.isArray(parsed.questions)) {
    return { questions: [], syllabus, invalidQuestionsArray: true };
  }

  return {
    questions: parsed.questions.map((question) => canonicalYamlQuestion(path, question, linesById)),
    syllabus
  };
}

function visibleMarkdownLines(content: string): string[] {
  const result: string[] = [];
  let fence: "```" | "~~~" | null = null;

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trimStart();
    if (fence) {
      if (trimmed.startsWith(fence)) fence = null;
      result.push("");
      continue;
    }
    if (trimmed.startsWith("```")) {
      fence = "```";
      result.push("");
      continue;
    }
    if (trimmed.startsWith("~~~")) {
      fence = "~~~";
      result.push("");
      continue;
    }
    result.push(line);
  }

  return result;
}

function firstMatch(lines: string[], pattern: RegExp): RegExpMatchArray | null {
  for (const line of lines) {
    const match = line.match(pattern);
    if (match) return match;
  }
  return null;
}

function parseMarkdown(path: string, content: string): CanonicalDocument | null {
  const lines = visibleMarkdownLines(content);
  const questions: CanonicalQuestion[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const idMatch = lines[index].match(/^##\s+(.+)$/);
    if (!idMatch) continue;

    let end = index + 1;
    while (end < lines.length && !/^##\s+/.test(lines[end])) end += 1;
    const block = lines.slice(index, end);
    const qMatch = firstMatch(block, /^Question:\s*(.*)$/i);
    const aMatch = firstMatch(block, /^Answer:\s*(.*)$/i);
    if (!qMatch && !aMatch) {
      index = end - 1;
      continue;
    }

    const categoryMatch = firstMatch(block, /^Category:\s*(.+)$/i);
    const tagsMatch = firstMatch(block, /^Tags:\s*(.+)$/i);
    const sourceMatch = firstMatch(block, /^Source:\s*(.+)$/i);

    questions.push({
      id: idMatch[1].trim(),
      question: qMatch?.[1].trim() ?? "",
      answer: { kind: "text", text: aMatch?.[1].trim() ?? "" },
      category: categoryMatch?.[1].trim(),
      tags: tagsMatch?.[1].split(",").map((tag) => tag.trim()).filter(Boolean),
      source: sourceMatch?.[1].trim(),
      location: { file: path, line: index + 1 },
      dialect: "native"
    });

    index = end - 1;
  }

  return questions.length > 0 ? { questions } : null;
}

export const nativeAdapter: StudyAdapter = {
  name: "native",
  supports(path: string): boolean {
    return [".yaml", ".yml", ".md", ".markdown"].includes(extname(path).toLowerCase());
  },
  parse(path: string, content: string): CanonicalDocument | null {
    const ext = extname(path).toLowerCase();
    if (ext === ".yaml" || ext === ".yml") return parseYaml(path, content);
    if (ext === ".md" || ext === ".markdown") return parseMarkdown(path, content);
    throw new Error(`Unsupported file type: ${ext}`);
  }
};
