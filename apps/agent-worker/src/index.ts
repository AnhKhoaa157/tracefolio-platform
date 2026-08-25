import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createAgentHealth, type AgentRunRequest } from "@tracefolio/agent-contracts";
import { AgentLoopError } from "./errors.js";
import { runAgent } from "./run-agent.js";

const port = Number(process.env.PORT ?? 4000);
const maxRequestBytes = 64 * 1024;
const maxTaskCharacters = 12_000;

const server = createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/health") {
      writeJson(response, 200, createAgentHealth());
      return;
    }

    if (request.method === "POST" && request.url === "/v1/agent-runs") {
      const agentRequest = validateAgentRunRequest(await readJsonBody(request));
      const result = await runAgent(agentRequest);
      console.info(
        JSON.stringify({
          event: "agent_run",
          requestId: result.requestId,
          status: result.status,
          dialect: result.dialect,
          skill: result.skill,
        }),
      );
      writeJson(response, 200, result);
      return;
    }

    writeJson(response, 404, { error: { code: "NOT_FOUND", message: "Route not found." } });
  } catch (error) {
    const knownError = toAgentLoopError(error);
    writeJson(response, knownError.statusCode, {
      error: { code: knownError.code, message: knownError.message },
    });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Tracefolio agent worker listening on http://127.0.0.1:${port}`);
});

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  let body = "";

  for await (const chunk of request) {
    body = `${body}${chunk.toString()}`;

    if (Buffer.byteLength(body) > maxRequestBytes) {
      throw new AgentLoopError("INVALID_REQUEST", "Request body exceeds the 64 KB limit.", 413);
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new AgentLoopError("INVALID_REQUEST", "Request body must be valid JSON.", 400);
  }
}

function validateAgentRunRequest(value: unknown): AgentRunRequest {
  if (!isRecord(value)) {
    throw new AgentLoopError("INVALID_REQUEST", "Request body must be a JSON object.", 400);
  }

  const { dialect, skill, task, mode, timeoutMs } = value;

  if (dialect !== "codex" && dialect !== "claude-code") {
    throw new AgentLoopError("INVALID_REQUEST", "dialect must be codex or claude-code.", 400);
  }

  if (typeof skill !== "string" || !skill.trim()) {
    throw new AgentLoopError("INVALID_REQUEST", "skill must be a non-empty string.", 400);
  }

  if (typeof task !== "string" || !task.trim() || task.length > maxTaskCharacters) {
    throw new AgentLoopError(
      "INVALID_REQUEST",
      `task must be a non-empty string up to ${maxTaskCharacters} characters.`,
      400,
    );
  }

  if (mode !== undefined && mode !== "preview" && mode !== "execute") {
    throw new AgentLoopError("INVALID_REQUEST", "mode must be preview or execute.", 400);
  }

  if (
    timeoutMs !== undefined &&
    (typeof timeoutMs !== "number" || !Number.isFinite(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 120_000)
  ) {
    throw new AgentLoopError(
      "INVALID_REQUEST",
      "timeoutMs must be between 1000 and 120000.",
      400,
    );
  }

  return { dialect, skill: skill.trim(), task: task.trim(), mode, timeoutMs };
}

function toAgentLoopError(error: unknown): AgentLoopError {
  if (error instanceof AgentLoopError) {
    return error;
  }

  return new AgentLoopError("INTERNAL_ERROR", "The agent worker could not process this request.", 500);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}
