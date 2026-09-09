import { readFile } from "node:fs/promises";
import { nativeAdapter } from "./adapters/native.js";
import type { CanonicalDocument, StudyAdapter } from "./types.js";

const adapters: StudyAdapter[] = [nativeAdapter];

function adapterFor(path: string): StudyAdapter | undefined {
  return adapters.find((adapter) => adapter.supports(path));
}

export async function tryLoadStudyFile(path: string): Promise<CanonicalDocument | null> {
  const adapter = adapterFor(path);
  if (!adapter) {
    const extension = path.includes(".") ? path.slice(path.lastIndexOf(".")) : "";
    throw new Error(`Unsupported file type: ${extension}`);
  }

  const content = await readFile(path, "utf8");
  return adapter.parse(path, content);
}

export async function loadStudyFile(path: string): Promise<CanonicalDocument> {
  const doc = await tryLoadStudyFile(path);
  if (!doc) throw new Error("File does not contain a StudyCI question document.");
  return doc;
}
