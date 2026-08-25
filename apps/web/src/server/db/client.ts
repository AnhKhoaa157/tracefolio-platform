import "server-only";

import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

import { DomainError } from "../domain/errors";
import { DatabaseFailure, normalizeDatabaseFailure } from "./errors";
import type { Database, DatabaseQuery } from "./types";

export const DATABASE_CONNECTION_TIMEOUT_MS = 5_000;
export const DATABASE_QUERY_TIMEOUT_MS = 5_000;

const DATABASE_IDLE_TIMEOUT_MS = 10_000;
const DATABASE_POOL_SIZE = 10;

interface TracefolioGlobal {
  tracefolioDatabase?: Database;
  tracefolioPool?: Pool;
}

function getGlobalState(): TracefolioGlobal {
  return globalThis as typeof globalThis & TracefolioGlobal;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new DatabaseFailure("DATABASE_CONFIGURATION");
  }

  return new Pool({
    connectionString,
    max: DATABASE_POOL_SIZE,
    idleTimeoutMillis: DATABASE_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: DATABASE_CONNECTION_TIMEOUT_MS,
    query_timeout: DATABASE_QUERY_TIMEOUT_MS,
    statement_timeout: DATABASE_QUERY_TIMEOUT_MS,
    application_name: "tracefolio-web",
  });
}

function safeQuery<Row extends QueryResultRow = QueryResultRow>(
  connection: DatabaseQuery,
  text: string,
  values?: readonly unknown[],
): Promise<QueryResult<Row>> {
  return connection.query<Row>(text, values).catch((error: unknown) => {
    throw normalizeDatabaseFailure(error);
  });
}

function wrapConnection(connection: DatabaseQuery): DatabaseQuery {
  return {
    query: <Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) => safeQuery<Row>(connection, text, values),
  };
}

function createDatabase(pool: Pool): Database {
  return {
    query: <Row extends QueryResultRow = QueryResultRow>(
      text: string,
      values?: readonly unknown[],
    ) => safeQuery<Row>(pool, text, values),
    transaction: async <Result>(callback: (connection: DatabaseQuery) => Promise<Result>) => {
      let client: PoolClient | undefined;

      try {
        client = await pool.connect();
        await safeQuery(client, "BEGIN");
        const result = await callback(wrapConnection(client));
        await safeQuery(client, "COMMIT");
        return result;
      } catch (error) {
        if (client) {
          try {
            await safeQuery(client, "ROLLBACK");
          } catch {
            // Preserve the original safe error and never expose driver details.
          }
        }

        if (error instanceof DatabaseFailure || error instanceof DomainError) throw error;
        throw normalizeDatabaseFailure(error);
      } finally {
        client?.release();
      }
    },
  };
}

export function getDatabase(): Database {
  const state = getGlobalState();

  if (!state.tracefolioDatabase) {
    state.tracefolioPool ??= createPool();
    state.tracefolioDatabase = createDatabase(state.tracefolioPool);
  }

  return state.tracefolioDatabase;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await getDatabase().query("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

export async function closeDatabase(): Promise<void> {
  const state = getGlobalState();

  if (state.tracefolioPool) {
    await state.tracefolioPool.end();
    state.tracefolioPool = undefined;
    state.tracefolioDatabase = undefined;
  }
}
