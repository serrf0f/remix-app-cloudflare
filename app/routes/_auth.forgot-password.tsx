import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  json,
  redirect,
} from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { eq } from "drizzle-orm";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "~/@shadcn/ui/button";
import { Input } from "~/@shadcn/ui/input";
import { Label } from "~/@shadcn/ui/label";
import { ResetPasswordLinkEmail } from "~/lib/auth.email.reset-password.server";
import { db, emailClient } from "~/lib/init.server";
import { resetPasswordTable, userTable } from "../lib/auth.drizzle.server";
import {
  DEFAULT_REDIRECT_URL,
  createPasswordResetToken,
  getSession,
} from "../lib/auth.lucia.server";

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
  errors: { email?: string };
  message?: string;
};
export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = String(formData.get("email"));
  const errors: ActionResult["errors"] = {};

  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email));

  if (!user || !user.emailVerified) {
    errors.email = "Invalid email";
    return json({ errors });
  }

  const verificationToken = await createPasswordResetToken(user.id);
  const url = new URL(request.url);
  const schemaAndDomain = `${url.protocol}//${url.hostname}${
    url.port ? `:${url.port}` : ""
  }`;
  const verificationLink = `${schemaAndDomain}/reset-password/${verificationToken}`;
  try {
    await emailClient.sendEmail({
      to: email,
      subject: "Password reset",
      htmlBody: <ResetPasswordLinkEmail resetPasswordUrl={verificationLink} />,
    });
  } catch (e) {
    console.error("cannot send reset password link", { e });
    await db
      .delete(resetPasswordTable)
      .where(eq(resetPasswordTable.id, verificationToken))
      .execute();
    errors.email = "unexpected error, please retry in a few moment";
    return json({ errors });
  }
  return json({ message: `An email has been sent to '${user.email}'` });
}

export default function ForgotPassword() {
  const actionData = useActionData<ActionResult>();
  const { state } = useNavigation();
  const loading = state === "submitting" || state === "loading";
  return (
    <div className="lg:p-8 flex items-center h-screen">
      <Link to="/signin">
        <Button
          variant="outline"
          className="absolute flex space-x-2 top-4 right-4"
        >
          <ArrowLeft />
          <span>Back to Sign In</span>
        </Button>
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center text-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Forgot password
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below, you will receive a link to reset your
            password.
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
              <Button
                disabled={loading}
                className="space-x-2 items-center flex"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>Send Link</span>
              </Button>
              {actionData?.message ? (
                <em className="text-xs">{actionData?.message}</em>
              ) : null}
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
