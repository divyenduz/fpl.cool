import { Effect, Context, Layer, pipe } from 'effect'
import { QueryExecutionError, DatabaseCreationError } from './Errors'
import { type Database, type QueryExecResult, SqlJsStatic } from 'sql.js'

export interface DatabaseService {
  database: (
    // TODO: SQL probably should be injected?
    SQL: SqlJsStatic,
    databasePath: string,
  ) => Effect.Effect<never, Error, Database>
  executeQuery: (
    database: Database,
    query: string,
  ) => Effect.Effect<never, QueryExecutionError, QueryExecResult[]>
}

export const DatabaseService = Context.Tag<DatabaseService>()

export const DatabaseServiceLive = Layer.succeed(
  DatabaseService,
  DatabaseService.of({
    database: (SQL: SqlJsStatic, databasePath: string) =>
      getDatabase(SQL, databasePath),
    executeQuery: (database: Database, query: string) =>
      executeQuery(database, query),
  }),
)

function getDatabase(SQL: SqlJsStatic, databasePath: string) {
  const program = pipe(
    Effect.tryPromise({
      try: () => fetch(databasePath),
      catch: (e) => new DatabaseCreationError(`${e}`),
    }),
    Effect.flatMap((response) =>
      Effect.tryPromise({
        try: () => response.arrayBuffer(),
        catch: (e) => new DatabaseCreationError(`${e}`),
      }),
    ),
    Effect.map((buffer) => new SQL.Database(new Uint8Array(buffer))),
  )
  return program
}

function executeQuery(database: Database, query: string) {
  const program = Effect.try({
    try: () => database.exec(query),
    catch: (e) => new QueryExecutionError(`${e}`),
  })
  return program
}
