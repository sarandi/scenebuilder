import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Scene Builder",
  description: "World building tool for authors and game masters",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}