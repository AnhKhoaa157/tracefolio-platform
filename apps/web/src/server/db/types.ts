import type { QueryResult, QueryResultRow } from "pg";

export interface DatabaseQuery {
  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
}

export interface Database extends DatabaseQuery {
  transaction<Result>(
    callback: (connection: DatabaseQuery) => Promise<Result>,
  ): Promise<Result>;
}
