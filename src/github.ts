import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";
import type { Finding } from "./types.js";

function escapeData(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeProperty(value: string): string {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
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

function markdownQuestionLines(lines: string[], questionId: string): number[] {
  const matches: number[] = [];
  let fence: "```" | "~~~" | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trimStart();
    if (fence) {
      if (trimmed.startsWith(fence)) fence = null;
      continue;
    }
    if (trimmed.startsWith("```")) {
      fence = "```";
      continue;
    }
    if (trimmed.startsWith("~~~")) {
      fence = "~~~";
      continue;
    }
    const match = line.match(/^##\s+(.+?)\s*$/);
    if (match?.[1].trim() === questionId) matches.push(index + 1);
  }

  return matches;
}

function yamlQuestionLines(lines: string[], questionId: string): number[] {
  const matches: number[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^\s*(?:-\s*)?id\s*:\s*(.*?)\s*$/i);
    if (match && unquoteYamlScalar(match[1]) === questionId) matches.push(index + 1);
  }
  return matches;
}

export async function findQuestionLine(file: string, questionId?: string): Promise<number> {
  if (!questionId) return 1;
  try {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    const ext = extname(file).toLowerCase();
    const matches = ext === ".md" || ext === ".markdown"
      ? markdownQuestionLines(lines, questionId)
      : yamlQuestionLines(lines, questionId);
    return matches.at(-1) ?? 1;
  } catch {
    return 1;
  }
}

export function githubAnnotationPath(file: string, workspace = process.env.GITHUB_WORKSPACE ?? process.cwd()): string {
  const absolute = isAbsolute(file) ? file : resolve(file);
  const path = relative(workspace, absolute) || file;
  return path.replace(/\\/g, "/");
}

export async function formatGitHubFinding(finding: Finding, workspace?: string): Promise<string> {
  const command = finding.severity === "error" ? "error" : "warning";
  const file = githubAnnotationPath(finding.file, workspace);
  const line = await findQuestionLine(finding.file, finding.questionId);
  const title = `StudyCI ${finding.code}`;
  const related = finding.relatedQuestionId ? ` (related: ${finding.relatedQuestionId})` : "";
  return `::${command} file=${escapeProperty(file)},line=${line},title=${escapeProperty(title)}::${escapeData(`${finding.message}${related}`)}`;
}
