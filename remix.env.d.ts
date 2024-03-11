/// <reference types="@remix-run/dev" />
/// <reference types="@remix-run/node" />
/// <reference types="lucia" />

import type { AppLoadContext as OriginalAppLoadContext } from "@remix-run/server-runtime";
import "lucia";
import { DrizzleUser } from "~/lib/auth.drizzle.server";

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      POSTMARK_API_TOKEN: string;
      POSTMARK_DEFAULT_FROM: string;
    }
  }
}

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseSessionAttributes: object;
    DatabaseUserAttributes: DrizzleUser;
  }
}
