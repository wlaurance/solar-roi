import {
  Instrument_Sans,
  Instrument_Serif,
} from "next/font/google";
import type { Metadata } from "next";
import { PostHogIdentify } from "@/components/analytics/posthog-identify";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-instrument-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SolarFlow",
  description:
    "Multi-project solar ROI, Google Solar roof insights, permits, and installers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <PostHogIdentify />
        {children}
      </body>
    </html>
  );
}
