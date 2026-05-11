import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { cookies } from "next/headers";
import { AppNav, type Corner } from "@/components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scene Builder",
  description: "World building tool for authors and game masters",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const initialCollapsed = cookieStore.get("nav-collapsed")?.value === "true";
  const initialCorner = (cookieStore.get("nav-corner")?.value as Corner) ?? "top-right";

  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <AppNav initialCollapsed={initialCollapsed} initialCorner={initialCorner} />
          <div id="page-content">
            {children}
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
