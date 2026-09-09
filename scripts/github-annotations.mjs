import { readFile } from "node:fs/promises";
import { extname, isAbsolute, relative, resolve } from "node:path";

function escapeData(value) {
  return String(value).replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeProperty(value) {
  return escapeData(value).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed.replace(/\s+#.*$/, "").trim();
}

async function findQuestionLine(file, questionId) {
  if (!questionId) return 1;
  try {
    const lines = (await readFile(file, "utf8")).split(/\r?\n/);
    const ext = extname(file).toLowerCase();
    const matches = [];
    let fence = null;

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (ext === ".md" || ext === ".markdown") {
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
      } else {
        const match = line.match(/^\s*(?:-\s*)?id\s*:\s*(.*?)\s*$/i);
        if (match && unquoteYamlScalar(match[1]) === questionId) matches.push(index + 1);
      }
    }

    return matches.at(-1) ?? 1;
  } catch {
    return 1;
  }
}

function annotationPath(file, workspace) {
  const absolute = isAbsolute(file) ? file : resolve(workspace, file);
  return (relative(workspace, absolute) || file).replace(/\\/g, "/");
}

const [resultFile, workspaceArg] = process.argv.slice(2);
if (!resultFile) process.exit(0);

try {
  const workspace = workspaceArg || process.env.GITHUB_WORKSPACE || process.cwd();
  const result = JSON.parse(await readFile(resultFile, "utf8"));
  for (const finding of result.findings ?? []) {
    const command = finding.severity === "error" ? "error" : "warning";
    const file = annotationPath(finding.file, workspace);
    const line = await findQuestionLine(finding.file, finding.questionId);
    const title = `StudyCI ${finding.code}`;
    const related = finding.relatedQuestionId ? ` (related: ${finding.relatedQuestionId})` : "";
    console.log(`::${command} file=${escapeProperty(file)},line=${line},title=${escapeProperty(title)}::${escapeData(`${finding.message}${related}`)}`);
  }
} catch (error) {
  console.error(`StudyCI annotation renderer: ${error instanceof Error ? error.message : String(error)}`);
}
