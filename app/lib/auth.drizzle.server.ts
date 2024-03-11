import {
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const userTable = sqliteTable("user", {
  id: text("id").notNull().primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }),
  hashedPassword: text("hashed_password"),
  username: text("username"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export type DrizzleUser = (typeof userTable)["$inferSelect"];

export const emailVerificationCodeTable = sqliteTable(
  "email_verification_code",
  {
    code: text("code").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id)
      .unique(),
    email: text("email").notNull(),
    expiresAt: integer("expires_at").notNull(),
    retry: integer("retry"),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.userId, table.email] }),
    };
  },
);

export const sessionTable = sqliteTable("session", {
  id: text("id").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at").notNull(),
});

export const oauthAccountTable = sqliteTable(
  "oauth_account",
  {
    providerId: text("provider_id").notNull(),
    providerUserId: text("provider_user_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => userTable.id),
  },
  (table) => {
    return {
      pk: primaryKey({ columns: [table.providerId, table.providerUserId] }),
    };
  },
);

export const resetPasswordTable = sqliteTable("reset_password", {
  id: text("id").notNull().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: integer("expires_at").notNull(),
});
