import { readdir, stat } from "node:fs/promises";
import { extname, join } from "node:path";

const supportedExtensions = new Set([".yaml", ".yml", ".md", ".markdown"]);
const ignoredDirectories = new Set(["node_modules", ".git", ".github", "dist", "coverage"]);

export interface DiscoveryResult {
  files: string[];
  explicitFile: boolean;
}

export function isSupportedStudyFile(path: string): boolean {
  return supportedExtensions.has(extname(path).toLowerCase());
}

async function collectDirectory(path: string): Promise<string[]> {
  const entries = (await readdir(path, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
  const files: string[] = [];

  for (const entry of entries) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirectories.has(entry.name)) continue;
      files.push(...await collectDirectory(child));
      continue;
    }
    if (entry.isFile() && isSupportedStudyFile(entry.name)) files.push(child);
  }

  return files;
}

export async function discoverFiles(path: string): Promise<DiscoveryResult> {
  const info = await stat(path);
  if (info.isFile()) return { files: [path], explicitFile: true };
  return { files: await collectDirectory(path), explicitFile: false };
}
