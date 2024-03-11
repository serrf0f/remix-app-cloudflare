import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

await migrate(drizzle(new Database("sqlite.db")), { migrationsFolder: "./db" });
