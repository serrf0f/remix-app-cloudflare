import { Turnstile } from "@marsidev/react-turnstile";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  json,
  redirect,
} from "@remix-run/cloudflare";
import {
  Form,
  Link,
  useActionData,
  useLoaderData,
  useNavigation,
} from "@remix-run/react";
import { and, eq } from "drizzle-orm";
import { Scrypt } from "lucia";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/@shadcn/ui/button";
import { Input } from "~/@shadcn/ui/input";
import { Label } from "~/@shadcn/ui/label";
import { SignUpVerificationCodeEmail } from "~/lib/auth.email.verification-code.server";
import { verifyTurnstile } from "~/lib/auth.turnstile.server";
import { useTurnstileRefreshKey } from "~/lib/useTurnstileRefreshKey";
import {
  emailVerificationCodeTable,
  userTable,
} from "../lib/auth.drizzle.server";

const REDIRECT_URL = "/verify-email-address";

export const meta: MetaFunction = () => {
  return [
    { title: "Sign up" },
    { name: "description", content: "Authentication - Sign up" },
  ];
};

export const loader = async ({
  request,
  context: { auth, cloudflare },
}: LoaderFunctionArgs) => {
  const { user, session } = await auth.getSession(request);
  if (user) {
    return redirect(REDIRECT_URL, { status: 307 });
  }
  const res = new Response(undefined, { status: 200 });
  auth.setSessionCookie(res, session);
  return {
    cloudflareTurnstileSitekey: cloudflare.env.CLOUDFLARE_TURNSTILE_SITEKEY,
  };
};

type ActionResult = {
  errors: { email?: string; password?: string; message?: string };
};
export async function action({ request, context }: ActionFunctionArgs) {
  const { auth, db, email: emailClient } = context;
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const errors: ActionResult["errors"] = {};

  if (!isValidEmail(email)) {
    errors.email = "Invalid email address";
  }
  if (password.length < 8) {
    errors.password = "Password should be at least 12 characters";
  }
  if (password.length > 255) {
    errors.password = "Password should be less than 256 characters";
  }
  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  if (!(await verifyTurnstile({ request, formData, context }))) {
    return json({ errors: { email: "Smart captcha challenge failed" } });
  }

  const hashedPassword = await new Scrypt().hash(password);
  const userId = crypto.randomUUID();
  try {
    await db
      .insert(userTable)
      .values({ id: userId, hashedPassword, email, createdAt: new Date() });
  } catch {
    return json({
      errors: {
        email: "User with same email address already exists, please sign-in",
      },
    });
  }

  // send verification code
  const code = await auth.generateEmailVerificationCode(userId, email);
  const url = new URL(request.url);
  const schemaAndDomain = `${url.protocol}//${url.hostname}${
    url.port ? `:${url.port}` : ""
  }`;

  try {
    await emailClient.sendEmail({
      to: email,
      subject: "Verification code",
      htmlBody: (
        <SignUpVerificationCodeEmail
          code={code}
          callbackUrl={`${schemaAndDomain}/verification-code`}
        />
      ),
    });
  } catch (e) {
    console.error("cannot signup", { e });
    await db.batch([
      db
        .delete(emailVerificationCodeTable)
        .where(
          and(
            eq(emailVerificationCodeTable.userId, userId),
            eq(emailVerificationCodeTable.email, email),
          ),
        ),
      db.delete(userTable).where(eq(userTable.id, userId)),
    ]);
    errors.message = "unexpected error, please retry in a few moment";
    return json({ errors });
  }

  const { cookie } = await auth.createSession(userId, {});
  return new Response(null, {
    status: 302,
    headers: {
      Location: REDIRECT_URL,
      "Set-Cookie": cookie.serialize(),
    },
  });
}

export default function Signup() {
  const actionData = useActionData<ActionResult>();
  const { state } = useNavigation();
  const loading = state === "submitting" || state === "loading";
  const { cloudflareTurnstileSitekey } = useLoaderData<typeof loader>();
  const [token, setToken] = useState<string | null>(null);
  const turnstileRefreshKey = useTurnstileRefreshKey(actionData);
  return (
    <div className="lg:p-8 flex items-center h-screen">
      <Link to="/signin">
        <Button variant="outline" className="absolute top-4 right-4">
          Sign In
        </Button>
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to create your account
          </p>
        </div>

        <div className="grid gap-6">
          <Form method="POST">
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="email">
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  disabled={loading}
                />
                {actionData?.errors?.email ? (
                  <em className="text-xs text-red-500">
                    {actionData?.errors.email}
                  </em>
                ) : null}
              </div>
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="password">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  placeholder="password"
                  type="password"
                  autoCorrect="off"
                  disabled={loading}
                />
                {actionData?.errors?.password ? (
                  <em className="text-xs text-red-500">
                    {actionData?.errors.password}
                  </em>
                ) : null}
              </div>
              {actionData?.errors?.message ? (
                <em className="text-xs text-red-500">
                  {actionData?.errors.message}
                </em>
              ) : null}
              <Turnstile
                key={turnstileRefreshKey}
                className="mx-auto"
                siteKey={cloudflareTurnstileSitekey}
                onSuccess={setToken}
              />
              <Button
                disabled={loading || !token}
                className="space-x-2 items-center flex"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>Sign Up with Email</span>
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}

function isValidEmail(email: string): boolean {
  return /.+@.+/.test(email);
}
