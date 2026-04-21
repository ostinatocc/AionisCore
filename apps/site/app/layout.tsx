import type { Metadata } from "next";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import {
  GeistPixelCircle,
  GeistPixelGrid,
  GeistPixelLine,
  GeistPixelSquare,
  GeistPixelTriangle,
} from "geist/font/pixel";
import { ReactNode } from "react";

import { SiteFooter, SiteHeader } from "../components/marketing";
import "./globals.css";

const fontClasses = [
  GeistSans.variable,
  GeistMono.variable,
  GeistPixelSquare.variable,
  GeistPixelGrid.variable,
  GeistPixelCircle.variable,
  GeistPixelTriangle.variable,
  GeistPixelLine.variable,
]
  .filter(Boolean)
  .join(" ");

export const metadata: Metadata = {
  title: "Aionis — The runtime for agents that learn from execution",
  description:
    "Self-evolving continuity execution-memory engine for agent systems. Continuity, action retrieval, uncertainty gates, replay, policy memory, and semantic forgetting in one runtime loop.",
  metadataBase: new URL("https://aionis.dev"),
  openGraph: {
    title: "Aionis Runtime",
    description:
      "The runtime for agents that learn from execution. Continuity, retrieval, replay, uncertainty gates.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontClasses}>
      <body className={`${GeistSans.className}`}>
        <div className="site-canvas">
          <div className="site-shell">
            <div className="site-main">
              <SiteHeader />
              <main className="site-content">{children}</main>
              <SiteFooter />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
