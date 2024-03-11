import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  json,
  redirect,
} from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { Scrypt } from "lucia";
import { Loader2 } from "lucide-react";
import { Button } from "~/@shadcn/ui/button";
import { Input } from "~/@shadcn/ui/input";
import { Label } from "~/@shadcn/ui/label";
import { auth, db } from "~/lib/init.server";
import { resetPasswordTable, userTable } from "../lib/auth.drizzle.server";
import { DEFAULT_REDIRECT_URL, getSession } from "../lib/auth.lucia.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Forgot password" },
    { name: "description", content: "Authentication - Forgot password" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user } = await getSession(request);
  if (user) {
    return redirect(DEFAULT_REDIRECT_URL, { status: 307 });
  }
  return null;
};

type ActionResult = {
  errors: { message?: string; expired?: boolean };
};
export async function action({
  request,
  params: { token },
}: ActionFunctionArgs) {
  const formData = await request.formData();
  const password = String(formData.get("password"));
  const passwordConfirmation = String(formData.get("password-confirm"));
  const errors: ActionResult["errors"] = {};

  if (!token) {
    errors.message =
      "Missing token, please double check the link url sent by email.";
    return json({ errors });
  }
  if (password !== passwordConfirmation) {
    errors.message = "Confirmation password mismatch.";
    return json({ errors });
  }

  const [verificationToken] = await db
    .select()
    .from(resetPasswordTable)
    .where(eq(resetPasswordTable.id, token));

  if (!verificationToken) {
    errors.message =
      "Token not found, please double check the link url sent by email.";
    return json({ errors });
  }

  if (verificationToken.expiresAt < Date.now()) {
    errors.message = "Token expired, please submit a new request.";
    errors.expired = true;
    return json({ errors });
  }

  await auth.invalidateUserSessions(verificationToken.userId);
  const hashedPassword = await new Scrypt().hash(password);
  db.transaction(async (tx) => {
    await tx
      .update(userTable)
      .set({ hashedPassword })
      .where(eq(userTable.id, verificationToken.userId));
    await tx
      .delete(resetPasswordTable)
      .where(eq(resetPasswordTable.id, verificationToken.id));
  });
  const session = await auth.createSession(verificationToken.userId, {});
  const sessionCookie = auth.createSessionCookie(session.id);
  return new Response(null, {
    status: 302,
    headers: {
      Location: DEFAULT_REDIRECT_URL,
      "Set-Cookie": sessionCookie.serialize(),
    },
  });
}

export default function ResetPassword() {
  const actionData = useActionData<ActionResult>();
  const { state } = useNavigation();
  const loading = state === "submitting" || state === "loading";
  return (
    <div className="lg:p-8 flex items-center h-screen">
      <div className="mx-auto flex w-full flex-col justify-center text-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Reset Password
          </h1>
          <p className="text-sm text-muted-foreground">
            Reset your password using the form below.
          </p>
        </div>

        <div className="grid gap-6">
          <Form method="POST">
            <div className="grid gap-2">
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="password">
                  Password
                </Label>
                <Input
                  id="password"
                  name="password"
                  placeholder="new password"
                  type="password"
                  autoCorrect="off"
                  disabled={loading}
                />
              </div>
              <div className="grid gap-1">
                <Label className="sr-only" htmlFor="password-confirm">
                  Confirm password
                </Label>
                <Input
                  id="password-confirm"
                  name="password-confirm"
                  placeholder="new password confirmation"
                  type="password"
                  autoCorrect="off"
                  disabled={loading}
                />
              </div>
              {actionData?.errors?.message ? (
                <em className="text-xs text-red-500">
                  {actionData?.errors.message}
                </em>
              ) : null}
              <Button
                disabled={loading}
                className="space-x-2 items-center flex"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>Reset Password</span>
              </Button>
              {actionData?.errors?.expired ? (
                <Link to="/forgot-password">
                  <Button variant="link">Go back to password reset page</Button>
                </Link>
              ) : null}
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
