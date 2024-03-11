import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { Lucia, TimeSpan } from "lucia";
import { sessionTable, userTable } from "./auth.drizzle.server";
import type { UserAuthenticated } from "./auth.types";
import { PostmarkEmailClient } from "./email.server";
import dotenv from "dotenv";
import { db } from "./db.server";

export const env = process.env;
export { db };
export let auth: ReturnType<typeof initAuth>;
export let emailClient: ReturnType<typeof initEmail>;
let initialized = false;

(() => {
  if (initialized) {
    return;
  }
  if (env.NODE_ENV !== "production") {
    dotenv.config();
  }
  auth = initAuth();
  emailClient = initEmail();
  initialized = true;
})();

export function initEmail() {
  return new PostmarkEmailClient(
    env.POSTMARK_API_TOKEN,
    env.POSTMARK_DEFAULT_FROM,
  );
}

export function initAuth() {
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
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        // domain: "example.com"
      },
    },
  });
}
