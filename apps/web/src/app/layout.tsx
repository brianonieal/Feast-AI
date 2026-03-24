// @version 0.5.0 - Echo: root layout (Server Component)
import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { ClerkClientProvider } from "@/components/ClerkClientProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["300", "400"],
  style: ["italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Feast-AI",
  description: "AI-native community operating system for meaningful gatherings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkClientProvider>
      <html lang="en" className={`${dmSans.variable} ${fraunces.variable}`}>
        <body className="font-sans">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkClientProvider>
  );
}
