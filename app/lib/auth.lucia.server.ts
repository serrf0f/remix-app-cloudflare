import { DrizzleSQLiteAdapter } from "@lucia-auth/adapter-drizzle";
import { createCookie, redirect } from "@remix-run/cloudflare";
import { eq } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Lucia, type Session, TimeSpan, verifyRequestOrigin } from "lucia";
import {
  emailVerificationCodeTable,
  resetPasswordTable,
  sessionTable,
  userTable,
} from "./auth.drizzle.server";
import type { UserAuthenticated } from "./auth.types";

export const DEFAULT_EMAIL_VERIFICATION_CODE_SIZE = 4;
export const DEFAULT_EMAIL_VERIFICATION_CODE_DURATION_MINUTES = 5;
export const DEFAULT_RESET_PASSWORD_DURATION_MINUTES = 60;
export const DEFAULT_REDIRECT_URL = "/";

export const userPrefs = createCookie("user-prefs", {
  maxAge: 604_800, // one week
});

const getLuciaClient = (db: DrizzleD1Database<Record<string, never>>) => {
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

export class LuciaAuth {
  private client: ReturnType<typeof getLuciaClient>;
  private db: DrizzleD1Database<Record<string, never>>;
  private sess: { user: UserAuthenticated; session: Session } | null;

  constructor(db: DrizzleD1Database<Record<string, never>>) {
    this.db = db;
    this.client = getLuciaClient(this.db);
    this.sess = null;
  }

  getSessionId(req: Request) {
    return this.client.readSessionCookie(req.headers.get("cookie") ?? "");
  }

  async getSession(req: Request) {
    const sessionId = this.getSessionId(req);
    if (!sessionId) {
      return {
        user: null,
        session: null,
      };
    }
    if (this.sess?.session?.id) {
      return this.sess;
    }
    this.sess = (await this.client.validateSession(sessionId)) as {
      user: UserAuthenticated;
      session: Session;
    };
    return this.sess;
  }

  setSessionCookie(res: Response, session?: Session | null) {
    if (session?.fresh) {
      res.headers.append(
        "Set-Cookie",
        this.client.createSessionCookie(session.id).serialize(),
      );
    }
    if (!session) {
      res.headers.append(
        "Set-Cookie",
        this.client.createBlankSessionCookie().serialize(),
      );
    }
  }

  async validateRequest(req: Request) {
    if (req.method !== "GET" && req.method !== "OPTION") {
      const originHeader = req.headers.get("Origin");
      const hostHeader =
        req.headers.get("Host") ?? req.headers.get("X-Forwarded-Host");
      if (
        !originHeader ||
        !hostHeader ||
        !verifyRequestOrigin(originHeader, [hostHeader])
      ) {
        throw new Response(null, {
          status: 403,
        });
      }
    }

    const cookieHeader = req.headers.get("Cookie");
    const cookie = (await userPrefs.parse(cookieHeader)) || {};
    const sessionId = this.getSessionId(req);
    if (!sessionId) {
      cookie.redirectUrl = req.url;
      throw redirect("/signin", {
        headers: {
          "Set-Cookie": await userPrefs.serialize(cookie),
        },
      });
    }

    const redirectUrl = cookie.redirectUrl || req.url;
    const { session, user } = await this.client.validateSession(sessionId);
    if (!session) {
      const sessionCookie = this.client.createBlankSessionCookie();
      const headers = new Headers();
      headers.append("Set-Cookie", sessionCookie.serialize());
      if (cookie.redirectUrl) {
        cookie.redirectUrl = "";
        headers.append("Set-Cookie", await userPrefs.serialize(cookie));
      }
      throw redirect(redirectUrl, { headers });
    }
    if (session?.fresh) {
      const sessionCookie = this.client.createSessionCookie(session.id);
      const headers = new Headers();
      headers.append("Set-Cookie", sessionCookie.serialize());
      if (cookie.redirectUrl) {
        cookie.redirectUrl = "";
        headers.append("Set-Cookie", await userPrefs.serialize(cookie));
      }
      throw redirect(redirectUrl, { headers });
    }

    const authenticatedUser = user as unknown as UserAuthenticated;

    if (authenticatedUser.banned) {
      throw new Response(null, {
        status: 403,
        statusText: "User has been banned",
      });
    }

    return authenticatedUser;
  }

  generateRandomCode(size = DEFAULT_EMAIL_VERIFICATION_CODE_SIZE) {
    const randomValues = crypto.getRandomValues(new Uint8Array(size));
    return Array.from(randomValues).map((num) => (num % 9) + 1);
  }

  async generateEmailVerificationCode(userId: string, email: string) {
    await this.db
      .delete(emailVerificationCodeTable)
      .where(eq(emailVerificationCodeTable.userId, userId))
      .execute();
    const code = this.generateRandomCode().join("");
    await this.db
      .insert(emailVerificationCodeTable)
      .values({
        userId,
        email,
        code,
        expiresAt:
          Date.now() +
          new TimeSpan(
            DEFAULT_EMAIL_VERIFICATION_CODE_DURATION_MINUTES,
            "m",
          ).milliseconds(),
      })
      .execute();
    return code;
  }

  async createPasswordResetToken(userId: string) {
    await this.db
      .delete(resetPasswordTable)
      .where(eq(resetPasswordTable.userId, userId))
      .execute();
    const tokenId = crypto.randomUUID();
    await this.db
      .insert(resetPasswordTable)
      .values({
        id: tokenId,
        userId: userId,
        expiresAt:
          Date.now() +
          new TimeSpan(
            DEFAULT_RESET_PASSWORD_DURATION_MINUTES,
            "m",
          ).milliseconds(),
      })
      .execute();
    return tokenId;
  }

  async getUser(request: Request) {
    const { user } = await this.getSession(request);
    if (!user) {
      throw new Response(null, { status: 401 });
    }
    return user;
  }

  invalidateSession(sessionId: string) {
    return this.client.invalidateSession(sessionId);
  }

  async createSession(...params: Parameters<typeof this.client.createSession>) {
    const session = await this.client.createSession(...params);
    const cookie = this.client.createSessionCookie(session.id);
    return { session, cookie };
  }

  invalidateUserSessions(userId: string) {
    return this.client.invalidateUserSessions(userId);
  }
}
