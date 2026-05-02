"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

type Props = {
  user: { id: string; name: string; username?: string | null; isAdmin: boolean; modules: string[] } | null;
  children: React.ReactNode;
};

export function AppFrame({ user, children }: Props) {
  const path = usePathname();
  const isAuthPage = path === "/login";

  if (isAuthPage || !user) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
