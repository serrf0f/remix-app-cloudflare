import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import type { AppLoadContext } from "@remix-run/cloudflare";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import { Lucia, TimeSpan } from "lucia";
import { sessionTable, userTable } from "./auth.drizzle.server";
import type { UserAuthenticated } from "./auth.types";
import { PostmarkEmailClient } from "./email.server";

export type DB = DrizzleD1Database<Record<string, never>>;

export let env: AppLoadContext["env"];
export let db: DB;
export let auth: ReturnType<typeof initAuth>;
export let emailClient: ReturnType<typeof initEmail>;
let initialized = false;

export async function initEnv(defaultEnv: AppLoadContext["env"]) {
  if (initialized) {
    return;
  }
  env = defaultEnv;
  db = drizzle(defaultEnv.DB);
  auth = initAuth(db);
  emailClient = initEmail(defaultEnv);
  initialized = true;
}

export const initEmail = (env: AppLoadContext["env"]) => {
  return new PostmarkEmailClient(
    env.POSTMARK_API_TOKEN,
    env.POSTMARK_DEFAULT_FROM,
  );
};

export const initAuth = (db: DrizzleD1Database<Record<string, never>>) => {
  const adapter = new DrizzleSQLiteAdapter(db, sessionTable, userTable);
  return new Lucia(adapter, {
    getSessionAttributes: (attributes) => {
      return attributes;
    },
    getUserAttributes: (attributes) => {
      return {
        id: attributes.id,
        email: attributes.email,
        emailVerified: attributes.emailVerified,
        username: attributes.username,
        avatarUrl: attributes.avatarUrl,
      } satisfies UserAuthenticated;
    },
    sessionExpiresIn: new TimeSpan(30, "d"),
    sessionCookie: {
      name: "session",
      expires: false,
      attributes: {
        secure: process.env.NODE_ENV === "PRODUCTION",
        sameSite: "strict",
        // domain: "example.com"
      },
    },
  });
};
