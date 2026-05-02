import { requireAdmin } from "@/lib/auth";

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
