import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import type { AgentRunRequest, AgentRunResponse } from "@tracefolio/agent-contracts";
import { AgentLoopError } from "./errors.js";
import { HarnessRunner } from "./harness-runner.js";
import { buildHarnessPrompt } from "./prompt.js";
import { loadSkill } from "./skill-registry.js";

const workerDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(workerDirectory, "..", "..", "..");
const defaultTimeoutMs = 60_000;

export async function runAgent(request: AgentRunRequest): Promise<AgentRunResponse> {
  const skill = await loadSkill(projectRoot, request.dialect, request.skill);
  const prompt = buildHarnessPrompt({
    dialect: request.dialect,
    skill,
    task: request.task.trim(),
  });
  const requestId = randomUUID();
  const mode = request.mode ?? "preview";

  if (mode === "preview") {
    return {
      requestId,
      status: "preview",
      dialect: request.dialect,
      skill: request.skill,
      promptCharacters: prompt.length,
    };
  }

  if (process.env.TRACEFOLIO_HARNESS_EXECUTION_ENABLED !== "true") {
    throw new AgentLoopError(
      "HARNESS_EXECUTION_DISABLED",
      "Set TRACEFOLIO_HARNESS_EXECUTION_ENABLED=true before using execute mode.",
      403,
    );
  }

  const timeoutMs = request.timeoutMs ?? readTimeoutMs();
  const runner = new HarnessRunner({
    projectRoot,
    profile: process.env.TRACEFOLIO_AGENT_PROFILE ?? "headless",
    timeoutMs,
  });
  const output = await runner.execute(prompt);

  return {
    requestId,
    status: "completed",
    dialect: request.dialect,
    skill: request.skill,
    promptCharacters: prompt.length,
    output,
  };
}

function readTimeoutMs(): number {
  const configured = Number(process.env.TRACEFOLIO_HARNESS_TIMEOUT_MS);

  if (Number.isFinite(configured) && configured >= 1_000 && configured <= 120_000) {
    return configured;
  }

  return defaultTimeoutMs;
}
