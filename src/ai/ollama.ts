import type { CanonicalAnswer, Finding, LoadedQuestion, OllamaConfig } from "../types.js";

const responseSchema = {
  type: "object",
  properties: {
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          code: { type: "string", enum: ["semantic-duplicate", "ambiguous-question", "question-answer-mismatch"] },
          questionId: { type: "string" },
          relatedQuestionId: { type: "string" },
          message: { type: "string" }
        },
        required: ["code", "questionId", "message"]
      }
    }
  },
  required: ["findings"]
} as const;

function answerText(answer: CanonicalAnswer | string | undefined): string {
  if (typeof answer === "string") return answer;
  if (!answer) return "";
  if (answer.kind === "text") return answer.text;
  return answer.correct.join(" | ");
}

export async function reviewWithOllama(items: LoadedQuestion[], config: OllamaConfig): Promise<Finding[]> {
  const selected = items.slice(0, config.maxQuestions);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  const payload = selected.map(({ file, question }) => ({
    file,
    id: question.id,
    question: question.question,
    answer: answerText(question.answer as CanonicalAnswer | string | undefined),
    category: question.category ?? null,
    source: question.source ?? null
  }));

  try {
    const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.model,
        stream: false,
        think: false,
        format: responseSchema,
        options: { temperature: 0 },
        messages: [
          {
            role: "system",
            content: "You are StudyCI's conservative semantic reviewer. Review only the supplied study questions. Flag semantic duplicates, materially ambiguous questions, or obvious mismatches between a question and its answer. Do not fact-check against outside knowledge, do not invent missing sources, and do not flag writing style or language choice. Return no finding when uncertain."
          },
          { role: "user", content: JSON.stringify(payload) }
        ]
      })
    });

    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}: ${await response.text()}`);
    const body = await response.json() as { message?: { content?: string } };
    if (!body.message?.content) throw new Error("Ollama returned no message content.");
    const parsed = JSON.parse(body.message.content) as { findings?: Array<{ code: string; questionId: string; relatedQuestionId?: string; message: string }> };
    const byId = new Map(selected.flatMap((item) => item.question.id ? [[item.question.id, item] as const] : []));

    const findings: Finding[] = (parsed.findings ?? []).flatMap((finding) => {
      const item = byId.get(finding.questionId);
      if (!item) return [];
      return [{
        severity: "warning" as const,
        code: finding.code,
        message: finding.message,
        file: item.file,
        line: item.question.location?.line,
        questionId: finding.questionId,
        relatedQuestionId: finding.relatedQuestionId
      }];
    });

    if (items.length > config.maxQuestions) {
      findings.push({
        severity: "warning",
        code: "ai-review-truncated",
        message: `AI review was limited to the first ${config.maxQuestions} of ${items.length} questions. Increase ai.maxQuestions in .studyci.yaml to review more.`,
        file: ".studyci.yaml"
      });
    }
    return findings;
  } catch (error) {
    if ((error as Error).name === "AbortError") throw new Error(`Ollama review timed out after ${config.timeoutMs}ms.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
