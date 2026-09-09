import test from "node:test";
import assert from "node:assert/strict";
import { reviewWithOllama } from "../dist/ai/ollama.js";

test("maps unique review ids back to source questions", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ message: { content: JSON.stringify({ findings: [{ code: "ambiguous-question", questionId: "item-2", message: "Too broad." }] }) } }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const findings = await reviewWithOllama([
      { file: "a.yaml", question: { id: "q_001", question: "Question A?", answer: "A", source: "x" } },
      { file: "b.yaml", question: { id: "q_001", idScope: "file", question: "Question B?", answer: "B", source: "y", location: { file: "b.yaml", line: 5 } } }
    ], { provider: "ollama", model: "qwen3.5:9b", baseUrl: "http://127.0.0.1:11434", timeoutMs: 1000, maxQuestions: 50 });

    const payload = JSON.parse(requestBody.messages[1].content);
    assert.deepEqual(payload.map((item) => item.questionId), ["item-1", "item-2"]);
    assert.deepEqual(payload.map((item) => item.sourceId), ["q_001", "q_001"]);
    assert.equal(findings[0].code, "ambiguous-question");
    assert.equal(findings[0].file, "b.yaml");
    assert.equal(findings[0].line, 5);
    assert.equal(findings[0].questionId, "q_001");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
