import { Label } from "@radix-ui/react-label";
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  json,
  redirect,
} from "@remix-run/node";
import { Form, useActionData, useNavigation } from "@remix-run/react";
import { and, eq } from "drizzle-orm";
import { Loader2 } from "lucide-react";
import { type ChangeEventHandler, useCallback, useEffect, useRef } from "react";
import { Button } from "~/@shadcn/ui/button";
import { Input } from "~/@shadcn/ui/input";
import { SignUpVerificationCodeEmail } from "~/lib/auth.email.verification-code.server";
import { auth, db, emailClient } from "~/lib/init.server";
import {
  emailVerificationCodeTable,
  userTable,
} from "../lib/auth.drizzle.server";
import {
  DEFAULT_EMAIL_VERIFICATION_CODE_SIZE,
  DEFAULT_REDIRECT_URL,
  generateEmailVerificationCode,
  getSession,
  validateRequest,
} from "../lib/auth.lucia.server";

const MAX_RETRY = 2;

export const meta: MetaFunction = () => {
  return [
    { title: "Verify email address" },
    {
      name: "description",
      content: "Authentication - Verification of the email address",
    },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { user } = await getSession(request);
  if (user?.emailVerified) {
    return redirect(DEFAULT_REDIRECT_URL, { status: 307 });
  }
  return null;
};

type ActionResult = { errors: { message?: string; resendCode?: boolean } };
export async function action({ request }: ActionFunctionArgs) {
  const errors: ActionResult["errors"] = {};
  const formData = await request.formData();
  const code = [
    Number(formData.get("code-1")),
    Number(formData.get("code-2")),
    Number(formData.get("code-3")),
    Number(formData.get("code-4")),
  ].join("");
  const resendAction = formData.get("resend");

  const user = await validateRequest(request);

  if (user.emailVerified) {
    return new Response(null, {
      status: 302,
      headers: {
        Location: DEFAULT_REDIRECT_URL,
      },
    });
  }

  const deleteVerificationCodeQuery = (tx?: any) => {
    return (tx ?? db)
      .delete(emailVerificationCodeTable)
      .where(
        and(
          eq(emailVerificationCodeTable.userId, user.id),
          eq(emailVerificationCodeTable.email, user.email),
        ),
      );
  };

  if (resendAction) {
    const newCode = await generateEmailVerificationCode(user.id, user.email);
    await emailClient.sendEmail({
      to: user.email,
      subject: "Verification code",
      htmlBody: (
        <SignUpVerificationCodeEmail
          code={newCode}
          callbackUrl={`${request.headers.get("host")}/verification-code`}
        />
      ),
    });
    return json({ errors });
  }

  if (code.length !== DEFAULT_EMAIL_VERIFICATION_CODE_SIZE) {
    return new Response(null, {
      status: 400,
    });
  }

  const [validationCode] = await db
    .select()
    .from(emailVerificationCodeTable)
    .where(
      and(
        eq(emailVerificationCodeTable.userId, user.id),
        eq(emailVerificationCodeTable.email, user.email),
      ),
    )
    .limit(1);

  if (!validationCode) {
    errors.resendCode = true;
    errors.message = "Validation code not found.";
    return json({ errors });
  }

  if (validationCode.expiresAt < Date.now()) {
    await deleteVerificationCodeQuery();
    errors.resendCode = true;
    errors.message =
      "Verification code has expired, please ask for a new code.";
    return json({ errors });
  }

  if (validationCode.code !== code) {
    if ((validationCode.retry || 0) >= MAX_RETRY) {
      errors.resendCode = true;
      errors.message = "Maximum retries reached. Please ask for a new code.";
      await deleteVerificationCodeQuery().execute();
    } else {
      // update retry count
      await db
        .update(emailVerificationCodeTable)
        .set({ retry: (validationCode.retry || 0) + 1 })
        .where(
          and(
            eq(emailVerificationCodeTable.userId, user.id),
            eq(emailVerificationCodeTable.email, user.email),
          ),
        )
        .execute();
      errors.resendCode = true;
      errors.message = `Validation code mismatched (${
        MAX_RETRY - (validationCode.retry || 0)
      } retries left). Please retry or ask for a new code.`;
    }
    return json({ errors });
  }

  await auth.invalidateUserSessions(user.id);
  await db.transaction(async (tx) => {
    await db
      .update(userTable)
      .set({ emailVerified: true })
      .where(eq(userTable.id, user.id));
    await deleteVerificationCodeQuery(tx);
  });

  if (Object.keys(errors).length > 0) {
    return json({ errors });
  }

  const session = await auth.createSession(user.id, {});
  const sessionCookie = auth.createSessionCookie(session.id);
  return new Response(null, {
    status: 302,
    headers: {
      Location: DEFAULT_REDIRECT_URL,
      "Set-Cookie": sessionCookie.serialize(),
    },
  });
}

export default function VerifyCode() {
  const actionData = useActionData<ActionResult>();
  const { state } = useNavigation();
  const refInput1 = useRef<HTMLInputElement | null>(null);
  const refInput2 = useRef<HTMLInputElement | null>(null);
  const refInput3 = useRef<HTMLInputElement | null>(null);
  const refInput4 = useRef<HTMLInputElement | null>(null);
  const refButton = useRef<HTMLButtonElement | null>(null);
  const onDigitEnter = useCallback<ChangeEventHandler<HTMLInputElement>>(
    (e) => {
      const newValue = e.target.value;
      if (newValue?.length === 0) {
        return;
      }

      if (newValue.length > 1) {
        const [v1, v2, v3, v4] = newValue;
        if (refInput1.current) {
          refInput1.current.value = v1;
        }
        if (refInput2.current) {
          refInput2.current.value = v2;
        }
        if (refInput3.current && v3) {
          refInput3.current.value = v3;
        }
        if (refInput4.current && v4) {
          refInput4.current.value = v4;
        }
        refButton.current?.click();
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (refInput1.current?.id === e.currentTarget.id) {
        refInput2.current?.focus();
      } else if (refInput2.current?.id === e.currentTarget.id) {
        refInput3.current?.focus();
      } else if (refInput3.current?.id === e.currentTarget.id) {
        refInput4.current?.focus();
      } else {
        refButton.current?.click();
      }
    },
    [],
  );
  useEffect(() => {
    refInput1.current?.focus();
  }, []);

  return (
    <div className="lg:p-8 flex items-center h-screen">
      <div className="mx-auto flex w-full flex-col justify-center text-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Verify your email account
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the code you received by email:
          </p>
        </div>

        <div className="grid gap-6">
          <Form method="POST">
            <div className="grid gap-2">
              <div className="flex justify-center space-x-3">
                <Label className="sr-only" htmlFor="code-1">
                  First digit
                </Label>
                <Input
                  ref={refInput1}
                  onChange={onDigitEnter}
                  className="text-center w-12"
                  id="code-1"
                  name="code-1"
                  type="text"
                  autoCapitalize="none"
                  minLength={1}
                  autoCorrect="off"
                  disabled={state === "submitting"}
                />
                <Label className="sr-only" htmlFor="code-2">
                  Second digit
                </Label>
                <Input
                  ref={refInput2}
                  onChange={onDigitEnter}
                  className="text-center w-12"
                  id="code-2"
                  name="code-2"
                  type="text"
                  autoCapitalize="none"
                  minLength={1}
                  autoCorrect="off"
                  disabled={state === "submitting"}
                />
                <Label className="sr-only" htmlFor="code-3">
                  Third digit
                </Label>
                <Input
                  ref={refInput3}
                  onChange={onDigitEnter}
                  className="text-center w-12"
                  id="code-3"
                  name="code-3"
                  type="text"
                  autoCapitalize="none"
                  minLength={1}
                  autoCorrect="off"
                  disabled={state === "submitting"}
                />
                <Label className="sr-only" htmlFor="code-4">
                  Third digit
                </Label>
                <Input
                  ref={refInput4}
                  onChange={onDigitEnter}
                  className="text-center w-12"
                  id="code-4"
                  name="code-4"
                  type="text"
                  autoCapitalize="none"
                  minLength={1}
                  autoCorrect="off"
                  disabled={state === "submitting"}
                />
              </div>
              {actionData?.errors?.message ? (
                <em className="text-xs text-red-500">
                  {actionData?.errors.message}
                </em>
              ) : null}
              <Button
                ref={refButton}
                disabled={state === "submitting"}
                className="mt-4 space-x-2 items-center flex"
              >
                {state === "submitting" && (
                  <Loader2 size={14} className="animate-spin" />
                )}
                <span>Verify</span>
              </Button>
              {actionData?.errors?.resendCode ? (
                <Form className="text-xs" method="POST">
                  <Input type="hidden" name="resend" value="1" />
                  <Button type="submit" variant="link">
                    Get a new code
                  </Button>
                </Form>
              ) : null}
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
