import { Outlet } from "@remix-run/react";

export default function AuthLayout() {
  return (
    <div className="p-4">
      <Outlet />
    </div>
  );
}
