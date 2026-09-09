import { readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
export const defaultConfig = { ai: { provider: "ollama", model: "qwen3.5:9b", baseUrl: "http://127.0.0.1:11434", timeoutMs: 120000, maxQuestions: 50 } };
export async function loadConfig(cwd = process.cwd()) {
  for (const name of [".studyci.yaml", ".studyci.yml"]) {
    try {
      const parsed = YAML.parse(await readFile(join(cwd, name), "utf8")) ?? {};
      return { ai: { ...defaultConfig.ai, ...(parsed.ai ?? {}), provider: "ollama" } };
    } catch (error) { if (error.code !== "ENOENT") throw error; }
  }
  return structuredClone(defaultConfig);
}
