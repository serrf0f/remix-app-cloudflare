export type UserAuthenticated = Pick<
  DrizzleUser,
  "id" | "email" | "emailVerified" | "username" | "avatarUrl"
>;
