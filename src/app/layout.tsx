import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BidWars",
  description: "The party bidding game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-950 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
