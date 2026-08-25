export const AGENT_RUNTIME_VERSION = "0.2.0";

export type AgentDialect = "claude-code" | "codex" | "dsh";

export type SkillDialect = Exclude<AgentDialect, "dsh">;

export type AgentRunMode = "preview" | "execute";

export type AgentRunErrorCode =
  | "INVALID_REQUEST"
  | "SKILL_NOT_FOUND"
  | "SKILL_TOO_LARGE"
  | "HARNESS_EXECUTION_DISABLED"
  | "HARNESS_NOT_READY"
  | "HARNESS_TIMEOUT"
  | "HARNESS_FAILED"
  | "INTERNAL_ERROR";

export interface AgentRunRequest {
  dialect: SkillDialect;
  skill: string;
  task: string;
  mode?: AgentRunMode;
  timeoutMs?: number;
}

export interface AgentRunError {
  code: AgentRunErrorCode;
  message: string;
}

export interface AgentRunResponse {
  requestId: string;
  status: "preview" | "completed" | "failed";
  dialect: SkillDialect;
  skill: string;
  promptCharacters: number;
  output?: string;
  error?: AgentRunError;
}

export type HookEvent =
  | "session_start"
  | "user_prompt_submit"
  | "pre_tool_use"
  | "post_tool_use"
  | "stop"
  | "subagent_start"
  | "subagent_stop";

export type HookDecision =
  | { type: "allow" }
  | { type: "block"; reason: string }
  | { type: "ask"; reason?: string }
  | { type: "inject_context"; content: string }
  | { type: "continue"; reason?: string };

export interface AgentHealth {
  service: "tracefolio-agent-worker";
  status: "UP";
  runtimeVersion: string;
}

export function createAgentHealth(): AgentHealth {
  return {
    service: "tracefolio-agent-worker",
    status: "UP",
    runtimeVersion: AGENT_RUNTIME_VERSION,
  };
}
