import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "DukaanPilot", template: "%s · DukaanPilot" },
  description:
    "Run your business smarter. Sell, manage, and grow from one place. By Ignivox Technologies.",
};

export const viewport: Viewport = {
  themeColor: "#123C2D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
