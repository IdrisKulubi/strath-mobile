import { Pool, type PoolClient, type QueryResultRow } from "pg";
let pool: Pool | undefined;
export function getPool() {
 if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
 return pool;
}
export async function query<T extends QueryResultRow = QueryResultRow>(sql: string, values: unknown[] = [], client?: PoolClient): Promise<T[]> {
 return (await (client ?? getPool()).query<T>(sql, values)).rows;
}
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
 const c = await getPool().connect();
 try { await c.query("BEGIN"); const result = await fn(c); await c.query("COMMIT"); return result; }
 catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}
