import { readFile } from "node:fs/promises";
import { nativeAdapter } from "./adapters/native.js";
import { quizrAdapter } from "./adapters/quizr.js";
import type { CanonicalDocument, StudyAdapter } from "./types.js";

const adapters: StudyAdapter[] = [nativeAdapter, quizrAdapter];

function compatibleAdapters(path: string): StudyAdapter[] {
  return adapters.filter((adapter) => adapter.supports(path));
}

export async function tryLoadStudyFile(path: string): Promise<CanonicalDocument | null> {
  const candidates = compatibleAdapters(path);
  if (candidates.length === 0) {
    const extension = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
    throw new Error(`Unsupported file type: ${extension}`);
  }

  const content = await readFile(path, "utf8");
  for (const adapter of candidates) {
    const doc = adapter.parse(path, content);
    if (doc) return doc;
  }
  return null;
}

export async function loadStudyFile(path: string): Promise<CanonicalDocument> {
  const doc = await tryLoadStudyFile(path);
  if (!doc) throw new Error("File does not contain a supported study question document.");
  return doc;
}
