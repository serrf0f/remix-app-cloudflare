import type { AppLoadContext } from "@remix-run/cloudflare";
import { type DrizzleD1Database, drizzle } from "drizzle-orm/d1";
import type { PlatformProxy } from "wrangler";
import { LuciaAuth } from "./app/lib/auth.lucia.server";
import { PostmarkEmailClient } from "./app/lib/email.server";

type Cloudflare = Omit<PlatformProxy<Env>, "dispose">;

declare module "@remix-run/cloudflare" {
  interface AppLoadContext {
    cloudflare: Cloudflare;
    auth: LuciaAuth;
    db: DrizzleD1Database<Record<string, never>>;
    email: PostmarkEmailClient;
  }
}

type GetLoadContext = (args: {
  request: Request;
  context: { cloudflare: Cloudflare }; // load context _before_ augmentation
}) => Promise<AppLoadContext>;

// Shared implementation compatible with Vite, Wrangler, and Cloudflare Pages
export const getLoadContext: GetLoadContext = async ({ context }) => {
  const db = drizzle(context.cloudflare.env.DB);
  const auth = new LuciaAuth(db);
  const email = new PostmarkEmailClient(
    context.cloudflare.env.POSTMARK_API_TOKEN,
    context.cloudflare.env.POSTMARK_DEFAULT_FROM,
  );

  return {
    ...context,
    auth,
    db,
    email,
  };
};
