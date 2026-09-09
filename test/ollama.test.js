import test from "node:test";
import assert from "node:assert/strict";
import { reviewWithOllama } from "../dist/ai/ollama.js";

test("maps structured Ollama findings to StudyCI findings", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ message: { content: JSON.stringify({ findings: [{ code: "ambiguous-question", questionId: "q1", message: "Too broad." }] }) } }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const findings = await reviewWithOllama([{ file: "sample.yaml", question: { id: "q1", question: "Explain security.", answer: "Use controls.", source: "x" } }], { provider: "ollama", model: "qwen3.5:9b", baseUrl: "http://127.0.0.1:11434", timeoutMs: 1000, maxQuestions: 50 });
    assert.equal(findings[0].code, "ambiguous-question");
    assert.equal(findings[0].file, "sample.yaml");
  } finally { globalThis.fetch = originalFetch; }
});
