import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "shipledger-cloud",
    version: "0.2.0",
    engine: "node24",
    timestamp: new Date().toISOString()
  });
}
