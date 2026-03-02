import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RedTeam Agent — FinVault Security",
  description:
    "AI-powered red team scenario generator for fintech security assessments",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
