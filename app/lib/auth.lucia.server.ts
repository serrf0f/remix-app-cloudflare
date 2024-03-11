import { eq } from "drizzle-orm";
import { type Session, TimeSpan, verifyRequestOrigin } from "lucia";
import { auth, db } from "~/lib/init.server";
import {
  emailVerificationCodeTable,
  resetPasswordTable,
} from "./auth.drizzle.server";
import type { UserAuthenticated } from "./auth.types";
import { createCookie, redirect } from "@remix-run/node";

export const DEFAULT_EMAIL_VERIFICATION_CODE_SIZE = 4;
export const DEFAULT_EMAIL_VERIFICATION_CODE_DURATION_MINUTES = 5;
export const DEFAULT_RESET_PASSWORD_DURATION_MINUTES = 60;
export const DEFAULT_REDIRECT_URL = "/";

export const userPrefs = createCookie("user-prefs", {
  maxAge: 604_800, // one week
});

export function getSessionId(req: Request) {
  return auth.readSessionCookie(req.headers.get("cookie") ?? "");
}

let _session: { user: UserAuthenticated; session: Session } | null = null;
export async function getSession(req: Request) {
  const sessionId = getSessionId(req);
  if (!sessionId) {
    return {
      user: null,
      session: null,
    };
  }
  if (_session?.session?.id) {
    return _session;
  }
  _session = (await auth.validateSession(sessionId)) as {
    user: UserAuthenticated;
    session: Session;
  };
  return _session;
}

export function setSessionCookie(res: Response, session?: Session | null) {
  if (session?.fresh) {
    res.headers.append(
      "Set-Cookie",
      auth.createSessionCookie(session.id).serialize(),
    );
  }
  if (!session) {
    res.headers.append(
      "Set-Cookie",
      auth.createBlankSessionCookie().serialize(),
    );
  }
}

export async function validateRequest(req: Request) {
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
  const sessionId = getSessionId(req);
  if (!sessionId) {
    cookie.redirectUrl = req.url;
    throw redirect("/signin", {
      headers: {
        "Set-Cookie": await userPrefs.serialize(cookie),
      },
    });
  }

  const redirectUrl = cookie.redirectUrl || req.url;
  const { session, user } = await auth.validateSession(sessionId);
  if (!session) {
    const sessionCookie = auth.createBlankSessionCookie();
    const headers = new Headers();
    headers.append("Set-Cookie", sessionCookie.serialize());
    if (cookie.redirectUrl) {
      cookie.redirectUrl = "";
      headers.append("Set-Cookie", await userPrefs.serialize(cookie));
    }
    throw redirect(redirectUrl, { headers });
  }
  if (session?.fresh) {
    const sessionCookie = auth.createSessionCookie(session.id);
    const headers = new Headers();
    headers.append("Set-Cookie", sessionCookie.serialize());
    if (cookie.redirectUrl) {
      cookie.redirectUrl = "";
      headers.append("Set-Cookie", await userPrefs.serialize(cookie));
    }
    throw redirect(redirectUrl, { headers });
  }
  return user as unknown as UserAuthenticated;
}

export function generateRandomCode(
  size = DEFAULT_EMAIL_VERIFICATION_CODE_SIZE,
) {
  const randomValues = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(randomValues).map((num) => (num % 9) + 1);
}

export async function generateEmailVerificationCode(
  userId: string,
  email: string,
): Promise<string> {
  await db
    .delete(emailVerificationCodeTable)
    .where(eq(emailVerificationCodeTable.userId, userId))
    .execute();
  const code = generateRandomCode().join("");
  await db
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

export async function createPasswordResetToken(
  userId: string,
): Promise<string> {
  await db
    .delete(resetPasswordTable)
    .where(eq(resetPasswordTable.userId, userId))
    .execute();
  const tokenId = crypto.randomUUID();
  await db
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

export async function getUser(request: Request) {
  const { user } = await getSession(request);
  if (!user) {
    throw new Response(null, { status: 401 });
  }
  return user;
}
