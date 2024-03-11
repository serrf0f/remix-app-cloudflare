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
import { userTable } from "../lib/auth.drizzle.server";
import {
  DEFAULT_REDIRECT_URL,
  getSession,
  setSessionCookie,
  userPrefs,
} from "../lib/auth.lucia.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Sign in" },
    { name: "description", content: "Authentication - Sign in" },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user, session } = await getSession(request);
  if (user) {
    return redirect(DEFAULT_REDIRECT_URL, { status: 307 });
  }
  const res = new Response(undefined, { status: 200 });
  setSessionCookie(res, session);
  return null;
};

type ActionResult = {
  errors: { message?: string; email?: string; password?: string };
};
export async function action({ request }: ActionFunctionArgs) {
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

  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email));

  if (!user?.hashedPassword) {
    errors.message = "Invalid email or password";
    return json({ errors });
  }

  if (!(await new Scrypt().verify(user.hashedPassword, password))) {
    errors.message = "Invalid email or password";
    return json({ errors });
  }

  const cookieHeader = request.headers.get("Cookie");
  const cookie = (await userPrefs.parse(cookieHeader)) || {};
  const session = await auth.createSession(user.id, {});
  const sessionCookie = auth.createSessionCookie(session.id);
  const headers = new Headers();
  const redirectUrl = cookie.redirectUrl || DEFAULT_REDIRECT_URL;

  headers.append("Location", redirectUrl);
  headers.append("Set-Cookie", sessionCookie.serialize());
  if (cookie.redirectUrl) {
    cookie.redirectUrl = "";
    headers.append("Set-Cookie", await userPrefs.serialize(cookie));
  }

  return new Response(null, {
    status: 302,
    headers,
  });
}

export default function Signin() {
  const actionData = useActionData<ActionResult>();
  const { state } = useNavigation();
  const loading = state === "submitting" || state === "loading";
  return (
    <div className="lg:p-8 flex items-center h-screen">
      <Link to="/signup">
        <Button variant="outline" className="absolute top-4 right-4">
          Sign Up
        </Button>
      </Link>
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email below to connect to your account
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
              <div className="flex justify-end -mt-2">
                <Link to="/forgot-password">
                  <Button variant="link" size="sm" type="button">
                    Forgot password?
                  </Button>
                </Link>
              </div>
              <Button
                disabled={loading}
                className="space-x-2 items-center flex"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                <span>Sign In with Email</span>
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
