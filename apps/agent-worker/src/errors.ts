import type { AgentRunErrorCode } from "@tracefolio/agent-contracts";

export class AgentLoopError extends Error {
  constructor(
    readonly code: AgentRunErrorCode,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "AgentLoopError";
  }
}
