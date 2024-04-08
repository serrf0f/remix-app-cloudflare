/// <reference types="lucia" />

import "lucia";
import { DrizzleUser } from "~/lib/auth.drizzle.server";

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseSessionAttributes: object;
    DatabaseUserAttributes: DrizzleUser;
  }
}
