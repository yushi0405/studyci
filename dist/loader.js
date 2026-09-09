import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import YAML from "yaml";
function parseMarkdown(content) {
  const questions = [];
  const blocks = content.split(/\n(?=##\s+)/g);
  for (const block of blocks) {
    const idMatch = block.match(/^##\s+(.+)$/m);
    const qMatch = block.match(/^Question:\s*(.+)$/mi);
    const aMatch = block.match(/^Answer:\s*(.+)$/mi);
    if (!idMatch || !qMatch || !aMatch) continue;
    const categoryMatch = block.match(/^Category:\s*(.+)$/mi);
    const tagsMatch = block.match(/^Tags:\s*(.+)$/mi);
    const sourceMatch = block.match(/^Source:\s*(.+)$/mi);
    questions.push({
      id: idMatch[1].trim(),
      question: qMatch[1].trim(),
      answer: aMatch[1].trim(),
      category: categoryMatch?.[1].trim(),
      tags: tagsMatch?.[1].split(",").map((x) => x.trim()).filter(Boolean),
      source: sourceMatch?.[1].trim()
    });
  }
  return { questions };
}
export async function loadStudyFile(path) {
  const content = await readFile(path, "utf8");
  const ext = extname(path).toLowerCase();
  if (ext === ".yaml" || ext === ".yml") {
    const parsed = YAML.parse(content);
    if (Array.isArray(parsed)) return { questions: parsed };
    return parsed ?? { questions: [] };
  }
  if (ext === ".md" || ext === ".markdown") return parseMarkdown(content);
  throw new Error(`Unsupported file type: ${ext}`);
}
