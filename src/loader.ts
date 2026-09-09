import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import YAML from "yaml";
import type { StudyDocument, StudyQuestion } from "./types.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isQuestionLike(value: unknown): boolean {
  return isRecord(value) && ("id" in value || "question" in value || "answer" in value);
}

function yamlStudyDocument(parsed: unknown): StudyDocument | null {
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return { questions: [] };
    if (!parsed.every(isQuestionLike)) return null;
    return { questions: parsed as StudyQuestion[] };
  }

  if (isRecord(parsed) && "questions" in parsed) return parsed as unknown as StudyDocument;
  return null;
}

function parseMarkdown(content: string): StudyDocument | null {
  const questions: StudyQuestion[] = [];
  const blocks = content.split(/\n(?=##\s+)/g);

  for (const block of blocks) {
    const idMatch = block.match(/^##\s+(.+)$/m);
    const qMatch = block.match(/^Question:\s*(.*)$/mi);
    const aMatch = block.match(/^Answer:\s*(.*)$/mi);
    if (!idMatch || (!qMatch && !aMatch)) continue;

    const categoryMatch = block.match(/^Category:\s*(.+)$/mi);
    const tagsMatch = block.match(/^Tags:\s*(.+)$/mi);
    const sourceMatch = block.match(/^Source:\s*(.+)$/mi);

    questions.push({
      id: idMatch[1].trim(),
      question: qMatch?.[1].trim() ?? "",
      answer: aMatch?.[1].trim() ?? "",
      category: categoryMatch?.[1].trim(),
      tags: tagsMatch?.[1].split(",").map((x) => x.trim()).filter(Boolean),
      source: sourceMatch?.[1].trim()
    });
  }

  return questions.length > 0 ? { questions } : null;
}

export async function tryLoadStudyFile(path: string): Promise<StudyDocument | null> {
  const content = await readFile(path, "utf8");
  const ext = extname(path).toLowerCase();

  if (ext === ".yaml" || ext === ".yml") {
    return yamlStudyDocument(YAML.parse(content) as unknown);
  }

  if (ext === ".md" || ext === ".markdown") return parseMarkdown(content);

  throw new Error(`Unsupported file type: ${ext}`);
}

export async function loadStudyFile(path: string): Promise<StudyDocument> {
  const doc = await tryLoadStudyFile(path);
  if (!doc) throw new Error("File does not contain a StudyCI question document.");
  return doc;
}
