import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Lorde Core Bot Terminal",
  description:
    "High-performance web terminal for automated Deriv trading bots",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-terminal-bg text-terminal-text antialiased">
        {children}
      </body>
    </html>
  );
}
