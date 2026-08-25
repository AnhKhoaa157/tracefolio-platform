import "server-only";

import { getDatabase } from "../db/client";
import { PostgresTracefolioRepository } from "../repositories/postgres-tracefolio-repository";
import { TracefolioService } from "./service";

let service: TracefolioService | undefined;

export function getTracefolioService(): TracefolioService {
  service ??= new TracefolioService(new PostgresTracefolioRepository(getDatabase()));
  return service;
}

export { TracefolioService } from "./service";
export * from "./errors";
export type * from "./ports";
