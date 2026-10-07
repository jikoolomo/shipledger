import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "../components/Navigation";
import React from "react";

export const metadata: Metadata = {
  title: "ShipLedger Cloud | Release Evidence Vault",
  description: "Every release leaves evidence. Verification and audit platform for software releases."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#090a0f] text-gray-100 min-h-screen flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
        <footer className="border-t border-[#1e2230] py-6 text-center text-xs text-gray-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              &copy; {new Date().getFullYear()} Oruvena ShipLedger. Built with Open Engine + Cloud Vault.
            </div>
            <div className="flex items-center gap-4 font-mono text-[11px]">
              <span>CRA Readiness Layer</span>
              <span>&bull;</span>
              <span>Deterministic Policy</span>
              <span>&bull;</span>
              <span>Customer Source Code Free</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
