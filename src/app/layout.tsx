import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UniBridge | Placement and No-Dues Portal",
  description: "University placement opportunities, applications, offers, and no-dues status.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en"><body className="min-h-screen antialiased">{children}</body></html>;
}
