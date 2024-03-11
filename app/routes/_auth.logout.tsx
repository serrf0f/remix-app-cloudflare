import { type ActionFunctionArgs, redirect } from "@remix-run/node";
import { auth } from "~/lib/init.server";
import { DEFAULT_REDIRECT_URL, getSession, setSessionCookie } from "../lib/auth.lucia.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await getSession(request);
  if (!session) {
    return redirect(DEFAULT_REDIRECT_URL);
  }
  await auth.invalidateSession(session.id);
  const res = new Response(undefined, { status: 302, headers: {
    Location: DEFAULT_REDIRECT_URL,
  }});
  setSessionCookie(res, null);
  return res;
};
