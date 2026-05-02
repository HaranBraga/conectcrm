import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppFrame } from "@/components/layout/AppFrame";
import { getCurrentUser } from "@/lib/auth";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Conect CRM",
  description: "CRM integrado com Evolution API",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AppFrame user={user}>{children}</AppFrame>
        <Toaster position="top-right" />
      </body>
    </html>
  );
}
