import { type ActionFunctionArgs, redirect } from "@remix-run/cloudflare";
import { DEFAULT_REDIRECT_URL } from "../lib/auth.lucia.server";

export const action = async ({
  request,
  context: { auth },
}: ActionFunctionArgs) => {
  const { session } = await auth.getSession(request);
  if (!session) {
    return redirect(DEFAULT_REDIRECT_URL);
  }
  await auth.invalidateSession(session.id);
  const res = new Response(undefined, {
    status: 302,
    headers: {
      Location: DEFAULT_REDIRECT_URL,
    },
  });
  auth.setSessionCookie(res, null);
  return res;
};
