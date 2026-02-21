import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A2UI Demo",
  description: "Agent-to-User Interface: AI agents that build UIs",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
