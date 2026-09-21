import { Pool, type PoolClient, type QueryResultRow } from "pg";

export interface SqlExecutor {
    query<T extends QueryResultRow = QueryResultRow>(sql: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

export interface QuestionnaireDatabase extends SqlExecutor {
    transaction<T>(work: (executor: SqlExecutor) => Promise<T>): Promise<T>;
    close?(): Promise<void>;
}

let pool: Pool | undefined;
let testDatabase: QuestionnaireDatabase | undefined;

export function getPool() {
    if (!pool) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            max: 5,
            connectionTimeoutMillis: 5_000,
            idleTimeoutMillis: 30_000,
        });
    }
    return pool;
}

export function setQuestionnaireDatabaseForTests(database?: QuestionnaireDatabase) {
    testDatabase = database;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: unknown[] = [],
    executor?: SqlExecutor,
): Promise<T[]> {
    return (await (executor ?? testDatabase ?? getPool()).query<T>(sql, values)).rows;
}

export async function transaction<T>(work: (executor: SqlExecutor) => Promise<T>): Promise<T> {
    if (testDatabase) return testDatabase.transaction(work);
    const client: PoolClient = await getPool().connect();
    try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
}
