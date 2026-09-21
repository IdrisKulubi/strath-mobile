/** Explicit opt-in migration; never run automatically on application startup. */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getPool, query } from "../lib/questionnaire/db";
import catalogue from "../lib/questionnaire/catalogue.json";
async function main(){
 if(!process.argv.includes("--apply")) throw new Error("Use --apply against an isolated DATABASE_URL first. This adds schema and backfills existing conversations.");
 const c=await getPool().connect();
 try {
  await c.query("SELECT pg_advisory_lock(3838)");
  await c.query("CREATE TABLE IF NOT EXISTS q_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
  const done=await query("SELECT name FROM q_migrations WHERE name=$1",["0038"],c);
  if(!done.length){
   const sql=readFileSync(resolve("drizzle/0038_questionnaire_matching.sql"),"utf8").replace(/^BEGIN;/," ").replace(/COMMIT;\s*$/," ");
   await c.query("BEGIN");
   await c.query(sql);
   await c.query("INSERT INTO q_migrations(name) VALUES ('0038')");
   await c.query("COMMIT");
  }
  await c.query("BEGIN");
  for(const id of ["connection","relationships","communication","lifestyle","values"]) await c.query("INSERT INTO q_categories(id,title) VALUES ($1,$2) ON CONFLICT DO NOTHING",[id,id]);
  for(const q of catalogue) await c.query("INSERT INTO q_questions(id,category_id,prompt,options,position,sensitive) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",[q.id,q.categoryId,q.prompt,JSON.stringify(q.options),q.position,q.sensitive]);
  await c.query("COMMIT");
  console.log("Questionnaire migration and 100-question catalogue applied. Enablement flags remain off.");
 } catch(e){await c.query("ROLLBACK");throw e;} finally {await c.query("SELECT pg_advisory_unlock(3838)");c.release();await getPool().end();}
}
main().catch(()=>{console.error("Migration failed; inspect database migration state before retrying.");process.exitCode=1;});
