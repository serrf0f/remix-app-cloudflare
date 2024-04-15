import type { AppLoadContext } from "@remix-run/cloudflare";

export type VerifyTurnstileParams = {
  request: Request;
  formData: FormData;
  context: AppLoadContext;
};

export async function verifyTurnstile({
  request,
  context,
  formData,
}: VerifyTurnstileParams) {
  const body = formData ?? (await request.formData());
  // Turnstile injects a token in "cf-turnstile-response".
  const token = body.get("cf-turnstile-response") as any;
  const ip = request.headers.get("CF-Connecting-IP") as any;

  // Validate the token by calling the
  // "/siteverify" API endpoint.
  const verifyFormData = new FormData();
  verifyFormData.append(
    "secret",
    context.cloudflare.env.CLOUDFLARE_TURNSTILE_SECRET,
  );
  verifyFormData.append("response", token);
  verifyFormData.append("remoteip", ip);

  const url = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
  const result = await fetch(url, {
    body: verifyFormData,
    method: "POST",
  });

  const outcome = (await result.json()) as {
    success: boolean;
    challenge_ts: string;
    hostname: string;
    "error-codes": string[];
    action: string;
    cdata: string;
  };

  if (!outcome.success) {
    console.warn("[TURNSTILE VALIDATION]", outcome);
  }

  return outcome.success;
}
