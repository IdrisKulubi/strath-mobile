import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../db/schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getDb() {
    if (!_db) {
        const url = process.env.DATABASE_URL;
        if (!url) {
            throw new Error("DATABASE_URL is not defined");
        }
        _db = drizzle(neon(url), { schema });
    }
    return _db;
}

export const db = new Proxy({} as ReturnType<typeof getDb>, {
    get(_, prop) {
        return Reflect.get(getDb(), prop);
    },
});
