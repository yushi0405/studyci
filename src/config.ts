import { readFile } from "node:fs/promises";
import { join } from "node:path";
import YAML from "yaml";
import type { StudyCIConfig } from "./types.js";

export const defaultConfig: StudyCIConfig = {
  ai: {
    provider: "ollama",
    model: "qwen3.5:9b",
    baseUrl: "http://127.0.0.1:11434",
    timeoutMs: 120000,
    maxQuestions: 50
  }
};

export async function loadConfig(cwd = process.cwd()): Promise<StudyCIConfig> {
  for (const name of [".studyci.yaml", ".studyci.yml"]) {
    try {
      const parsed = YAML.parse(await readFile(join(cwd, name), "utf8")) ?? {};
      return {
        ai: {
          ...defaultConfig.ai,
          ...(parsed.ai ?? {}),
          provider: "ollama"
        }
      };
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "ENOENT") throw error;
    }
  }
  return structuredClone(defaultConfig);
}
