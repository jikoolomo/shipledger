import Link from "next/link";
import React from "react";

export function Navigation() {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
              S
            </div>
            <div>
              <div className="font-semibold text-foreground tracking-tight flex items-center gap-2">
                ShipLedger
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800 font-mono">
                  CLOUD
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground hidden sm:block">
                Every release leaves evidence.
              </div>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-foreground/90 hover:text-white hover:bg-muted transition-colors"
            >
              Overview
            </Link>
            <Link
              href="/repositories"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-white hover:bg-muted transition-colors"
            >
              Repositories
            </Link>
            <Link
              href="/releases/rel-production-v0.8.3"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-white hover:bg-muted transition-colors"
            >
              Release Vault
            </Link>
            <Link
              href="/findings"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-white hover:bg-muted transition-colors"
            >
              Findings
            </Link>
            <Link
              href="/settings"
              className="px-3 py-1.5 text-sm font-medium rounded-md text-muted-foreground hover:text-white hover:bg-muted transition-colors"
            >
              Settings
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            OIDC Ingestion Active
          </div>
          <div className="text-xs text-muted-foreground border-l border-border pl-3">
            Oruvena Org
          </div>
        </div>
      </div>
    </header>
  );
}
