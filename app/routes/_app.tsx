import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { Outlet } from "@remix-run/react";

export async function loader({
  request,
  context: { auth },
}: LoaderFunctionArgs) {
  await auth.validateRequest(request);
  return null;
}

export async function action({
  request,
  context: { auth },
}: LoaderFunctionArgs) {
  await auth.validateRequest(request);
}

export default function Layout() {
  return <Outlet />;
}
