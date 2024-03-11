import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import {userTable} from "../app/lib/auth.drizzle.server"

const db = drizzle(new Database("sqlite.db"));

// Create admin user
await db.insert(userTable).values({
  id: crypto.randomUUID(),
  email: "<INSERT_EMAIL>",
  emailVerified: true,
  hashedPassword: "<INSERT_HASH_PWD>",
  createdAt: new Date()
}).onConflictDoNothing();

console.log(`Seeding complete.`);
