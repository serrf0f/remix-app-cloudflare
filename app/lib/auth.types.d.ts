import type { DrizzleUser } from "./auth.drizzle.server";

export type UserAuthenticated = Omit<DrizzleUser, "hashedPassword">;
