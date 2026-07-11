import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PEL Product Knowledge Agent",
  description: "PEL Product Knowledge Agent Web Interface",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
